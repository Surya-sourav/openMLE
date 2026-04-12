# Cross-Validation Strategies

## Why Cross-Validation Matters
A single train/test split introduces high variance in performance estimates. Cross-validation provides a more reliable estimate of generalisation performance by using multiple non-overlapping splits.

---

## K-Fold Cross-Validation

```python
from sklearn.model_selection import KFold, cross_val_score
import numpy as np

kf = KFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(model, X, y, cv=kf, scoring='r2')
print(f"R² = {scores.mean():.4f} ± {scores.std():.4f}")
```

**Choosing k**:
- k=5: Good balance of bias/variance, default choice
- k=10: Lower bias, higher variance, slower
- k=n (LOOCV): Lowest bias, highest variance, very slow — only for tiny datasets (<100 rows)

---

## Stratified K-Fold (Classification)

Preserves class distribution in each fold — always use for classification:
```python
from sklearn.model_selection import StratifiedKFold

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(clf, X, y, cv=skf, scoring='f1_weighted')
```

---

## Time Series Cross-Validation

Do NOT use standard K-Fold for time series — it leaks future data. Use:
```python
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=5)
scores = cross_val_score(model, X, y, cv=tscv, scoring='neg_mean_squared_error')
rmse_scores = np.sqrt(-scores)
```

---

## Nested Cross-Validation (Hyperparameter Tuning + Evaluation)

Avoids overfitting the hyperparameter search to the test set:
```python
from sklearn.model_selection import GridSearchCV, cross_val_score, StratifiedKFold

inner_cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
outer_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

param_grid = {'n_estimators': [100, 200], 'max_depth': [None, 10]}
clf = GridSearchCV(RandomForestClassifier(random_state=42), param_grid, cv=inner_cv, scoring='f1_weighted')

outer_scores = cross_val_score(clf, X, y, cv=outer_cv, scoring='f1_weighted')
print(f"Unbiased F1: {outer_scores.mean():.4f} ± {outer_scores.std():.4f}")
```

---

## Scoring Metrics Reference

| Task | Metric | Sklearn string |
|------|--------|----------------|
| Binary classification | ROC-AUC | `'roc_auc'` |
| Multi-class | F1 weighted | `'f1_weighted'` |
| Multi-class | F1 macro | `'f1_macro'` |
| Regression | R² | `'r2'` |
| Regression | RMSE | `'neg_root_mean_squared_error'` |
| Regression | MAE | `'neg_mean_absolute_error'` |
| Imbalanced | Average precision | `'average_precision'` |

---

## Cross-Validated Predictions

```python
from sklearn.model_selection import cross_val_predict
from sklearn.metrics import confusion_matrix

y_pred_cv = cross_val_predict(clf, X, y, cv=5)
print(confusion_matrix(y, y_pred_cv))

# For probabilities (classification)
y_proba_cv = cross_val_predict(clf, X, y, cv=5, method='predict_proba')
```

---

## Reporting Results

Always report mean ± std across folds:
```python
scores = cross_val_score(model, X, y, cv=5, scoring='f1_weighted')
print(f"F1 = {scores.mean():.4f} ± {scores.std():.4f} (n_folds=5)")
print(f"Per-fold: {[f'{s:.4f}' for s in scores]}")
```

**Rule of thumb**: If std > 0.05, consider a larger dataset or simpler model — variance is too high to trust the mean estimate.
