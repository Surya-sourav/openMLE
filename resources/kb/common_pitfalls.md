# Common ML Pitfalls and How to Avoid Them

## 1. Data Leakage

### What it is
Using information from the test set (or future) during training, leading to overly optimistic evaluation.

### Common sources
- Fitting scalers/encoders on the full dataset before splitting
- Including target-correlated features created using the full dataset (e.g., target encoding without CV)
- Time-series data split randomly instead of by time

### Fix
```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# WRONG: fit scaler on all data
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)   # leaks test distribution into training
X_train, X_test = train_test_split(X_scaled)

# CORRECT: use Pipeline (fit only on train)
pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', RandomForestClassifier())
])
X_train, X_test, y_train, y_test = train_test_split(X, y)
pipe.fit(X_train, y_train)
score = pipe.score(X_test, y_test)
```

---

## 2. Wrong Metric for the Problem

| Situation | Wrong Metric | Right Metric |
|-----------|-------------|--------------|
| Imbalanced classes | Accuracy | F1 (macro or weighted), ROC-AUC, PR-AUC |
| Regression with outliers | MSE/RMSE | MAE or Huber loss |
| Need calibrated probabilities | Raw probability | Brier score |
| Cost-sensitive (FN >> FP) | Accuracy, Precision | Recall, F2 score |

---

## 3. Not Checking for Multicollinearity

Highly correlated features inflate feature importances and hurt linear models:
```python
import pandas as pd
import numpy as np

corr = pd.DataFrame(X_train).corr().abs()
upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
highly_correlated = [col for col in upper.columns if any(upper[col] > 0.95)]
print(f"Highly correlated features to remove: {highly_correlated}")
```

---

## 4. Ignoring Class Imbalance

Symptom: 95% accuracy on a dataset where 95% of samples belong to one class.
Fix: See `class_imbalance.md` — use `class_weight='balanced'` + appropriate metrics.

---

## 5. Insufficient Cross-Validation

Using a single train/test split gives unreliable estimates. Always use k-fold:
```python
from sklearn.model_selection import StratifiedKFold, cross_val_score
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(clf, X, y, cv=cv, scoring='f1_weighted')
```

---

## 6. Not Checking for Train/Test Distribution Shift

If train and test data come from different distributions, model will underperform:
```python
# Quick check: train a classifier to distinguish train vs test
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

X_combined = np.vstack([X_train, X_test])
y_combined = np.array([0]*len(X_train) + [1]*len(X_test))
clf_drift = RandomForestClassifier(random_state=42)
scores = cross_val_score(clf_drift, X_combined, y_combined, cv=3, scoring='roc_auc')
print(f"Distribution drift AUC: {scores.mean():.3f}")
# If AUC > 0.7, train/test distributions differ significantly
```

---

## 7. Overfitting Without Detection

Signs: high training accuracy, low validation accuracy.
```python
# Detect via learning curves
from sklearn.model_selection import learning_curve
import matplotlib.pyplot as plt

train_sizes, train_scores, val_scores = learning_curve(
    clf, X, y, cv=5, n_jobs=-1, scoring='f1_weighted',
    train_sizes=np.linspace(0.1, 1.0, 10)
)
# Plot train_scores.mean() vs val_scores.mean() — large gap = overfitting
```
**Fix**: Reduce model complexity, add regularization, use more data, add dropout, early stopping.

---

## 8. Feature Scaling Mistakes

| Algorithm | Needs Scaling? |
|-----------|---------------|
| Logistic Regression | YES |
| SVM/SVR | YES |
| KNN | YES |
| Neural Networks | YES |
| Decision Tree | No |
| Random Forest | No |
| XGBoost/LightGBM | No |
| Linear/Ridge/Lasso | YES |

---

## 9. Incorrect Handling of Categorical Features

- **Label encoding ordinal as nominal** — tells model 'dog'=0 < 'cat'=1 < 'bird'=2 (wrong order)
- **One-hot encoding high cardinality** — creates thousands of features (use target encoding instead)
- **Not handling unknown categories at inference** — set `handle_unknown='ignore'` in OneHotEncoder

```python
from sklearn.preprocessing import OneHotEncoder
enc = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
```

---

## 10. Hyperparameter Tuning on Test Set

If you tune hyperparameters using the test set, your test score is no longer an unbiased estimate.
**Fix**: Use a 3-way split (train / validation / test) or nested cross-validation.

```python
# 3-way split
X_trainval, X_test, y_trainval, y_test = train_test_split(X, y, test_size=0.15, stratify=y)
X_train, X_val, y_train, y_val = train_test_split(X_trainval, y_trainval, test_size=0.18, stratify=y_trainval)
# Tune using X_val, evaluate finally on X_test (once)
```

---

## 11. NaN Handling Mistakes

- **Dropping rows with NaN**: Loses data, biases sample if NaN not random
- **Imputing with global statistics after split**: Data leakage — impute using only training set statistics
- **Not flagging NaN**: Imputed value hides the information that a value was missing

Best practice:
```python
from sklearn.impute import SimpleImputer
import pandas as pd

# Create missingness indicator before imputing
for col in df.columns[df.isnull().any()]:
    df[f'{col}_missing'] = df[col].isna().astype(int)

# Then impute using training statistics only (via Pipeline)
```
