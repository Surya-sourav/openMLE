# Handling Class Imbalance

## Detecting Imbalance
```python
print(y.value_counts(normalize=True))
# Mild imbalance: minority class > 20%
# Moderate imbalance: minority class 5–20%
# Severe imbalance: minority class < 5%
```

---

## Strategy 1: Class Weights (Simplest — Try First)

Most sklearn classifiers support `class_weight='balanced'`:
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

clf = RandomForestClassifier(class_weight='balanced', random_state=42)
# Or
clf = LogisticRegression(class_weight='balanced', max_iter=1000)
```
Internally weights = n_samples / (n_classes * np.bincount(y))

---

## Strategy 2: Resampling with imbalanced-learn

### SMOTE (Synthetic Minority Over-sampling)
Best for tabular data with moderate imbalance. Generates synthetic minority samples by interpolating between real ones.
```python
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

sm = SMOTE(sampling_strategy='auto', k_neighbors=5, random_state=42)
X_res, y_res = sm.fit_resample(X_train, y_train)
```

### ADASYN (Adaptive Synthetic Sampling)
Focuses on hard-to-classify minority samples.
```python
from imblearn.over_sampling import ADASYN
ada = ADASYN(sampling_strategy='auto', random_state=42)
X_res, y_res = ada.fit_resample(X_train, y_train)
```

### RandomUnderSampler
When majority class has many redundant samples.
```python
from imblearn.under_sampling import RandomUnderSampler
rus = RandomUnderSampler(sampling_strategy=0.5, random_state=42)
X_res, y_res = rus.fit_resample(X_train, y_train)
```

### Combination: SMOTEENN
SMOTE + Edited Nearest Neighbours cleaning — often best results.
```python
from imblearn.combine import SMOTEENN
smote_enn = SMOTEENN(random_state=42)
X_res, y_res = smote_enn.fit_resample(X_train, y_train)
```

---

## Strategy 3: Threshold Tuning

Instead of predicting at 0.5 default, tune the decision threshold on validation set:
```python
from sklearn.metrics import precision_recall_curve
prec, rec, thresholds = precision_recall_curve(y_val, clf.predict_proba(X_val)[:, 1])
# Find threshold that maximises F1
f1_scores = 2 * prec * rec / (prec + rec + 1e-8)
best_thresh = thresholds[np.argmax(f1_scores)]
y_pred = (clf.predict_proba(X_test)[:, 1] >= best_thresh).astype(int)
```

---

## Evaluation Metrics for Imbalanced Data

**Do NOT use accuracy** — misleading. Use:

```python
from sklearn.metrics import (
    f1_score, precision_score, recall_score,
    roc_auc_score, average_precision_score,
    classification_report, confusion_matrix
)

print(classification_report(y_test, y_pred))
print("ROC-AUC:", roc_auc_score(y_test, clf.predict_proba(X_test)[:, 1]))
print("PR-AUC:", average_precision_score(y_test, clf.predict_proba(X_test)[:, 1]))
print("F1 (weighted):", f1_score(y_test, y_pred, average='weighted'))
print("F1 (macro):", f1_score(y_test, y_pred, average='macro'))
```

**PR-AUC (Average Precision)** is better than ROC-AUC when imbalance is severe.

---

## Decision Guide

| Imbalance | n_samples | Recommended Strategy |
|-----------|-----------|---------------------|
| Mild (>20%) | Any | class_weight='balanced' |
| Moderate (5–20%) | >1000 | SMOTE + class_weight |
| Severe (<5%) | >1000 | SMOTEENN or ADASYN |
| Any | Small (<500) | class_weight only (SMOTE can overfit) |
| Any | Very large (>100k) | Undersampling + class_weight |

---

## imbalanced-learn Pipeline (Best Practice)

Always resample INSIDE cross-validation folds to avoid data leakage:
```python
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.over_sampling import SMOTE
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score

pipe = ImbPipeline([
    ('scaler', StandardScaler()),
    ('smote', SMOTE(random_state=42)),
    ('clf', RandomForestClassifier(class_weight='balanced', random_state=42)),
])

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(pipe, X, y, cv=cv, scoring='f1_macro')
print(f"F1 macro: {scores.mean():.4f} ± {scores.std():.4f}")
```
