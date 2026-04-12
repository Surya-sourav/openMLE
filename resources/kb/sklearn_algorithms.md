# Scikit-learn Algorithm Selection Guide

## Classification Algorithms

### LogisticRegression
- **Best for**: Binary/multi-class classification, interpretable linear boundaries, high-dimensional sparse data (text)
- **Library**: `sklearn.linear_model.LogisticRegression`
- **Key hyperparameters**: `C` (inverse regularization, default 1.0), `solver` ('lbfgs', 'saga', 'liblinear'), `max_iter` (default 100 — increase to 1000 for convergence), `class_weight` ('balanced' for imbalanced datasets)
- **Strengths**: Fast, interpretable coefficients, works well with many features
- **Weaknesses**: Assumes linear decision boundary, poor on complex non-linear data

### RandomForestClassifier
- **Best for**: Tabular data with mixed feature types, feature importance ranking, moderate dataset sizes (<500k rows)
- **Library**: `sklearn.ensemble.RandomForestClassifier`
- **Key hyperparameters**: `n_estimators` (100–500), `max_depth` (None or 10–30), `min_samples_split` (2–10), `max_features` ('sqrt' default), `class_weight` ('balanced')
- **Strengths**: Robust to outliers, handles missing values poorly (impute first), built-in feature importance, low overfitting risk
- **Weaknesses**: Slow on large datasets, memory-intensive, poor on very high-dimensional sparse data

### GradientBoostingClassifier
- **Best for**: Tabular data where accuracy matters most, Kaggle-style competitions
- **Library**: `sklearn.ensemble.GradientBoostingClassifier`
- **Key hyperparameters**: `n_estimators` (100–500), `learning_rate` (0.01–0.3), `max_depth` (3–7), `subsample` (0.8), `min_samples_leaf` (1–50)
- **Strengths**: Often best accuracy on tabular data, handles heterogeneous features
- **Weaknesses**: Slow training, many hyperparameters, prone to overfitting without tuning

### SVC (Support Vector Classifier)
- **Best for**: Small-to-medium datasets (<50k rows), high-dimensional feature spaces, clear margin separation
- **Library**: `sklearn.svm.SVC`
- **Key hyperparameters**: `C` (regularization), `kernel` ('rbf', 'linear', 'poly'), `gamma` ('scale' default), `probability` (True for predict_proba)
- **Strengths**: Effective in high-dimensional spaces, memory-efficient (uses support vectors only)
- **Weaknesses**: Does not scale to large datasets (O(n²–n³) training), requires feature scaling, hard to interpret

### KNeighborsClassifier
- **Best for**: Small datasets, local pattern recognition, baseline comparison
- **Library**: `sklearn.neighbors.KNeighborsClassifier`
- **Key hyperparameters**: `n_neighbors` (5–15), `weights` ('uniform' or 'distance'), `metric` ('euclidean', 'manhattan')
- **Strengths**: Simple, no training phase, naturally multi-class
- **Weaknesses**: Slow prediction on large datasets, sensitive to irrelevant features, requires feature scaling

### DecisionTreeClassifier
- **Best for**: Interpretable models, rule extraction, feature interaction discovery
- **Library**: `sklearn.tree.DecisionTreeClassifier`
- **Key hyperparameters**: `max_depth` (3–10 to prevent overfitting), `min_samples_split`, `criterion` ('gini', 'entropy')
- **Strengths**: Highly interpretable, handles mixed types, no scaling needed
- **Weaknesses**: High variance (overfits easily), not competitive with ensembles in accuracy

---

## Regression Algorithms

### LinearRegression / Ridge / Lasso
- **Best for**: Linear relationships, interpretable coefficients, feature selection (Lasso)
- **Library**: `sklearn.linear_model`
- **Ridge hyperparameters**: `alpha` (regularization strength, default 1.0)
- **Lasso hyperparameters**: `alpha`, promotes sparsity (feature selection)
- **Use ElasticNet** when both L1 and L2 regularization are desired

### RandomForestRegressor
- **Best for**: Non-linear tabular regression, feature importance
- **Library**: `sklearn.ensemble.RandomForestRegressor`
- **Key hyperparameters**: same as classifier variant; `n_estimators` 100–500

### GradientBoostingRegressor
- **Best for**: Best accuracy on tabular regression tasks
- **Library**: `sklearn.ensemble.GradientBoostingRegressor`
- **Key hyperparameters**: same as classifier; `loss` ('squared_error', 'absolute_error', 'huber')

### SVR (Support Vector Regression)
- **Best for**: Small datasets, non-linear regression with RBF kernel
- **Library**: `sklearn.svm.SVR`
- **Key hyperparameters**: `C`, `epsilon` (tube width), `kernel`, `gamma`

---

## Algorithm Selection Heuristics

| Situation | Recommended Algorithm |
|-----------|----------------------|
| n < 100 | SVC, KNN, LinearRegression |
| 100 < n < 10,000 | SVC (kernel='rbf'), RandomForest, GradientBoosting |
| n > 10,000 | RandomForest, LogisticRegression (classification), Ridge/Lasso (regression) |
| Imbalanced classes | RandomForest (class_weight='balanced'), LogisticRegression (class_weight='balanced') |
| Need interpretability | LogisticRegression, DecisionTree |
| Many irrelevant features | Lasso, RandomForest (handles internally) |
| Text / sparse features | LogisticRegression (solver='saga'), LinearSVC |
| Non-linear patterns | RandomForest, GradientBoosting, SVC (rbf) |

---

## Code Templates

```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
import numpy as np

clf = RandomForestClassifier(
    n_estimators=200,
    max_depth=None,
    min_samples_split=2,
    max_features='sqrt',
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
scores = cross_val_score(clf, X_train, y_train, cv=5, scoring='f1_weighted')
print(f"CV F1: {scores.mean():.4f} ± {scores.std():.4f}")
clf.fit(X_train, y_train)
```
