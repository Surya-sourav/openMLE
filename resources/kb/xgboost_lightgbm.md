# XGBoost and LightGBM

## XGBoost

### Installation
```bash
pip install xgboost
```

### Classification
```python
import xgboost as xgb
from sklearn.model_selection import cross_val_score

clf = xgb.XGBClassifier(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    gamma=0,
    min_child_weight=1,
    scale_pos_weight=neg/pos,   # For imbalanced: ratio of neg to pos samples
    use_label_encoder=False,
    eval_metric='logloss',
    random_state=42,
    n_jobs=-1,
    device='cuda'    # or 'cpu'
)
```

### Regression
```python
reg = xgb.XGBRegressor(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective='reg:squarederror',   # or 'reg:absoluteerror' for MAE
    random_state=42
)
```

### Early Stopping (Prevents Overfitting)
```python
clf.fit(
    X_train, y_train,
    eval_set=[(X_val, y_val)],
    early_stopping_rounds=50,
    verbose=100
)
print(f"Best iteration: {clf.best_iteration}")
```

### Key Hyperparameters
| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| `n_estimators` | 100 | 100–2000 | More = better but slower, needs early stopping |
| `max_depth` | 6 | 3–10 | Higher = more complex, more overfit |
| `learning_rate` | 0.3 | 0.01–0.3 | Lower = more robust, needs more trees |
| `subsample` | 1.0 | 0.5–1.0 | Row sampling per tree |
| `colsample_bytree` | 1.0 | 0.5–1.0 | Feature sampling per tree |
| `min_child_weight` | 1 | 1–10 | Minimum sum of instance weights in leaf |
| `gamma` | 0 | 0–5 | Minimum loss reduction for split |
| `reg_alpha` | 0 | 0–1 | L1 regularization |
| `reg_lambda` | 1 | 1–10 | L2 regularization |

---

## LightGBM

### Installation
```bash
pip install lightgbm
```

### Why LightGBM?
- **2–10× faster** than XGBoost on large datasets (>100k rows)
- **Lower memory** usage
- **Better accuracy** on high-cardinality categoricals (native support)
- Leaf-wise splitting vs XGBoost's level-wise

### Classification
```python
import lightgbm as lgb

clf = lgb.LGBMClassifier(
    n_estimators=1000,
    num_leaves=31,       # key parameter (replaces max_depth)
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_samples=20,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1,
    device='gpu',        # or 'cpu'
    verbose=-1
)
clf.fit(
    X_train, y_train,
    eval_set=[(X_val, y_val)],
    callbacks=[lgb.early_stopping(50), lgb.log_evaluation(100)]
)
```

### Native Categorical Support
```python
# Pass categorical feature indices — LightGBM handles encoding internally
clf = lgb.LGBMClassifier(...)
clf.fit(X_train, y_train, categorical_feature=[0, 2, 5])  # column indices
```

### Key Hyperparameters
| Parameter | Default | Range | Note |
|-----------|---------|-------|------|
| `num_leaves` | 31 | 20–300 | Controls complexity (use instead of max_depth) |
| `min_child_samples` | 20 | 10–100 | Prevents overfitting on small splits |
| `max_depth` | -1 | -1 to 15 | -1 = unlimited (controlled by num_leaves) |
| `learning_rate` | 0.1 | 0.01–0.3 | |
| `subsample` | 1.0 | 0.5–1.0 | Row fraction per tree |
| `colsample_bytree` | 1.0 | 0.5–1.0 | Feature fraction per tree |
| `reg_alpha` | 0 | 0–1 | L1 |
| `reg_lambda` | 0 | 0–10 | L2 |

---

## XGBoost vs LightGBM vs sklearn GBM

| Feature | sklearn GBM | XGBoost | LightGBM |
|---------|-------------|---------|----------|
| Speed | Slow | Medium | Fast |
| Memory | High | Medium | Low |
| GPU support | No | Yes | Yes |
| Categorical native | No | No | Yes |
| Best for | Baseline | General | Large datasets |
| Installation | Built-in | pip | pip |

---

## Hyperparameter Tuning with Optuna
```python
import optuna
from sklearn.model_selection import cross_val_score

def objective(trial):
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 100, 1000),
        'num_leaves': trial.suggest_int('num_leaves', 20, 150),
        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
        'subsample': trial.suggest_float('subsample', 0.5, 1.0),
        'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
        'min_child_samples': trial.suggest_int('min_child_samples', 5, 100),
    }
    clf = lgb.LGBMClassifier(**params, random_state=42, verbose=-1)
    return cross_val_score(clf, X_train, y_train, cv=3, scoring='f1_weighted').mean()

study = optuna.create_study(direction='maximize')
study.optimize(objective, n_trials=50)
print(study.best_params)
```
