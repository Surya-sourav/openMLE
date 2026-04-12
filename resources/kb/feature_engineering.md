# Feature Engineering Best Practices

## Numerical Features

### Scaling
- **StandardScaler**: Zero mean, unit variance. Required for SVM, KNN, logistic regression, neural nets. `from sklearn.preprocessing import StandardScaler`
- **MinMaxScaler**: Scales to [0,1]. Good for neural networks, when bounded range matters.
- **RobustScaler**: Uses median and IQR — resistant to outliers. Prefer when outliers are present.
- **Rule**: Tree-based models (RF, GBM, XGBoost) do NOT require scaling.

### Outlier Handling
```python
from scipy import stats
# Z-score capping
df[col] = df[col].clip(lower=df[col].quantile(0.01), upper=df[col].quantile(0.99))
# IQR method
Q1, Q3 = df[col].quantile([0.25, 0.75])
IQR = Q3 - Q1
df[col] = df[col].clip(Q1 - 1.5*IQR, Q3 + 1.5*IQR)
```

### Transformations
- **Log transform**: `np.log1p(x)` for right-skewed distributions (e.g., income, prices). Reduces skewness.
- **Square root**: `np.sqrt(x)` for moderate skew, count data.
- **Box-Cox / Yeo-Johnson**: Automatic power transform. `sklearn.preprocessing.PowerTransformer`
- **Binning**: `pd.cut()` or `pd.qcut()` to convert continuous → ordinal categorical.

### Interaction Features
```python
df['area'] = df['length'] * df['width']
df['ratio_ab'] = df['col_a'] / (df['col_b'] + 1e-8)
df['diff_ab'] = df['col_a'] - df['col_b']
```

---

## Categorical Features

### Ordinal Encoding
Use when there is natural order: small < medium < large
```python
from sklearn.preprocessing import OrdinalEncoder
enc = OrdinalEncoder(categories=[['low','medium','high']])
df[['size_enc']] = enc.fit_transform(df[['size']])
```

### One-Hot Encoding
Use for nominal categories with < ~20 unique values.
```python
df = pd.get_dummies(df, columns=['color', 'city'], drop_first=True, dtype=int)
```

### Target Encoding
Use for high-cardinality categoricals with regression tasks.
```python
from sklearn.preprocessing import TargetEncoder
enc = TargetEncoder()
df['city_enc'] = enc.fit_transform(df[['city']], y)
```

### Frequency Encoding
Replaces category with its frequency — preserves cardinality signal.
```python
freq_map = df['category'].value_counts(normalize=True).to_dict()
df['category_freq'] = df['category'].map(freq_map)
```

---

## Missing Value Imputation

### Strategy Selection
| Data Type | Distribution | Strategy |
|-----------|-------------|----------|
| Numerical | Normal | Mean imputation |
| Numerical | Skewed/outliers | Median imputation |
| Categorical | Any | Mode (most frequent) |
| Any | MCAR (<5% missing) | Mean/median/mode fine |
| Any | MAR (>5%) | KNN imputer or iterative imputer |
| Any | MNAR | Flag + impute |

```python
from sklearn.impute import SimpleImputer, KNNImputer

# Simple
num_imputer = SimpleImputer(strategy='median')
cat_imputer = SimpleImputer(strategy='most_frequent')

# KNN (better for MAR)
knn_imputer = KNNImputer(n_neighbors=5)
X_imputed = knn_imputer.fit_transform(X)

# Always add missingness indicator for MNAR
df['col_was_missing'] = df['col'].isna().astype(int)
```

---

## Date/Time Features
```python
df['year']        = df['date'].dt.year
df['month']       = df['date'].dt.month
df['day_of_week'] = df['date'].dt.dayofweek   # 0=Monday
df['is_weekend']  = df['day_of_week'] >= 5
df['quarter']     = df['date'].dt.quarter
df['hour']        = df['date'].dt.hour         # if datetime
# Cyclic encoding for periodic features
import numpy as np
df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
```

---

## Feature Selection

### Variance Threshold
```python
from sklearn.feature_selection import VarianceThreshold
sel = VarianceThreshold(threshold=0.01)  # Remove near-constant features
X_reduced = sel.fit_transform(X)
```

### Correlation-based Removal
```python
corr_matrix = pd.DataFrame(X).corr().abs()
upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
to_drop = [col for col in upper.columns if any(upper[col] > 0.95)]
```

### Permutation Importance (model-agnostic)
```python
from sklearn.inspection import permutation_importance
result = permutation_importance(model, X_val, y_val, n_repeats=10, random_state=42)
# result.importances_mean gives feature importance ranking
```

### Recursive Feature Elimination
```python
from sklearn.feature_selection import RFECV
rfecv = RFECV(estimator=clf, cv=5, scoring='f1_weighted', min_features_to_select=5)
rfecv.fit(X_train, y_train)
X_selected = rfecv.transform(X_train)
```
