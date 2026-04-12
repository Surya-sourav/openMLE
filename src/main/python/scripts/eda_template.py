"""
EDA Template Script — executed by AnalysisAgent via sandboxService.
Reads DATASET_PATH, computes statistics, writes JSON to stdout.

Environment variables:
  DATASET_PATH   : absolute path to the CSV file
  TARGET_COLUMN  : name of the target column (optional)
  MAX_SAMPLE_ROWS: max rows to sample for expensive computations (default 10000)
"""

import sys
import os
import json
import warnings
warnings.filterwarnings('ignore')

try:
    import pandas as pd
    import numpy as np
except ImportError as e:
    print(json.dumps({"error": f"Missing dependency: {e}. Run: pip install pandas numpy"}), file=sys.stderr)
    sys.exit(1)

dataset_path = os.environ.get('DATASET_PATH', '')
target_column = os.environ.get('TARGET_COLUMN', '')
max_sample_rows = int(os.environ.get('MAX_SAMPLE_ROWS', 10000))

if not dataset_path or not os.path.exists(dataset_path):
    print(json.dumps({"error": f"DATASET_PATH not set or file not found: {dataset_path}"}), file=sys.stderr)
    sys.exit(1)

# ── Load data ─────────────────────────────────────────────────────────────────
try:
    df = pd.read_csv(dataset_path, low_memory=False)
except Exception as e:
    print(json.dumps({"error": f"Failed to read CSV: {e}"}), file=sys.stderr)
    sys.exit(1)

row_count, col_count = df.shape

# ── Column statistics ─────────────────────────────────────────────────────────
def infer_dtype(series: pd.Series) -> str:
    non_null = series.dropna()
    if len(non_null) == 0:
        return "text"
    numeric_ratio = pd.to_numeric(non_null, errors='coerce').notna().mean()
    if numeric_ratio > 0.8:
        return "numeric"
    n_unique = non_null.nunique()
    if n_unique < 20 and len(non_null) > 50:
        return "categorical"
    return "text"


columns_stats = []
for col in df.columns:
    series = df[col]
    dtype = infer_dtype(series)
    null_count = int(series.isna().sum())
    null_pct = round(null_count / row_count * 100, 2)
    n_unique = int(series.nunique(dropna=True))
    sample_vals = [str(v) for v in series.dropna().head(5).tolist()]

    stat: dict = {
        "name": col,
        "dtype": dtype,
        "nullCount": null_count,
        "nullPct": null_pct,
        "uniqueCount": n_unique,
        "sampleValues": sample_vals,
    }

    if dtype == "numeric":
        num_series = pd.to_numeric(series, errors='coerce').dropna()
        if len(num_series) > 0:
            stat["min"] = round(float(num_series.min()), 6)
            stat["max"] = round(float(num_series.max()), 6)
            stat["mean"] = round(float(num_series.mean()), 6)
            stat["median"] = round(float(num_series.median()), 6)
            stat["std"] = round(float(num_series.std()), 6)
            stat["skewness"] = round(float(num_series.skew()), 4)
            stat["kurtosis"] = round(float(num_series.kurt()), 4)

    if dtype == "categorical":
        vc = series.value_counts(normalize=True).head(10)
        stat["topCategories"] = {str(k): round(float(v), 4) for k, v in vc.items()}

    columns_stats.append(stat)

# ── Target column analysis ────────────────────────────────────────────────────
target_info = {}
if target_column and target_column in df.columns:
    t_series = df[target_column]
    t_dtype = infer_dtype(t_series)
    target_info["column"] = target_column
    target_info["dtype"] = t_dtype

    if t_dtype == "categorical" or t_series.nunique() < 20:
        vc = t_series.value_counts()
        target_info["classDistribution"] = {str(k): int(v) for k, v in vc.items()}
        target_info["nClasses"] = int(t_series.nunique())
        total = len(t_series.dropna())
        minority_count = int(vc.min())
        majority_count = int(vc.max())
        target_info["imbalanceRatio"] = round(majority_count / minority_count, 2) if minority_count > 0 else None
        target_info["inferredTask"] = "classification"
    else:
        num = pd.to_numeric(t_series, errors='coerce').dropna()
        target_info["min"] = round(float(num.min()), 4)
        target_info["max"] = round(float(num.max()), 4)
        target_info["mean"] = round(float(num.mean()), 4)
        target_info["std"] = round(float(num.std()), 4)
        target_info["inferredTask"] = "regression"
else:
    target_info = {"column": "", "dtype": "unknown", "inferredTask": "unknown"}

# ── Correlation matrix (numeric columns only) ─────────────────────────────────
numeric_cols = [c["name"] for c in columns_stats if c["dtype"] == "numeric"]
correlations = {}
if len(numeric_cols) >= 2:
    sample_df = df[numeric_cols]
    if len(sample_df) > max_sample_rows:
        sample_df = sample_df.sample(max_sample_rows, random_state=42)
    try:
        corr_matrix = sample_df.apply(pd.to_numeric, errors='coerce').corr()
        # Only keep pairs with |correlation| > 0.5
        for i, col_a in enumerate(corr_matrix.columns):
            for col_b in corr_matrix.columns[i+1:]:
                val = corr_matrix.loc[col_a, col_b]
                if not np.isnan(val) and abs(val) > 0.5:
                    correlations[f"{col_a}|{col_b}"] = round(float(val), 4)
    except Exception:
        pass

# ── Missing value summary ─────────────────────────────────────────────────────
missing_cols = [c for c in columns_stats if c["nullCount"] > 0]
missing_summary = [
    {"column": c["name"], "nullCount": c["nullCount"], "nullPct": c["nullPct"]}
    for c in sorted(missing_cols, key=lambda x: x["nullPct"], reverse=True)
]

# ── Constant / near-constant columns ─────────────────────────────────────────
constant_cols = [c["name"] for c in columns_stats if c["uniqueCount"] <= 1]
near_constant_cols = [c["name"] for c in columns_stats if 1 < c["uniqueCount"] <= 2 and c["dtype"] != "categorical"]

# ── Duplicate rows ─────────────────────────────────────────────────────────────
n_duplicates = int(df.duplicated().sum())

# ── Output JSON ──────────────────────────────────────────────────────────────
result = {
    "rowCount": row_count,
    "columnCount": col_count,
    "nDuplicates": n_duplicates,
    "columns": columns_stats,
    "targetInfo": target_info,
    "correlations": correlations,
    "missingSummary": missing_summary,
    "constantColumns": constant_cols,
    "nearConstantColumns": near_constant_cols,
    "numericColumnCount": len(numeric_cols),
    "categoricalColumnCount": len([c for c in columns_stats if c["dtype"] == "categorical"]),
    "textColumnCount": len([c for c in columns_stats if c["dtype"] == "text"]),
}

print(json.dumps(result))
