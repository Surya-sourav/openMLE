# PyTorch Training Patterns

## Basic Training Loop

```python
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import json

# Device selection
device = torch.device('cuda' if torch.cuda.is_available() else
                      'mps' if torch.backends.mps.is_available() else 'cpu')
print(f"Using device: {device}")

# Dataset preparation
X_tensor = torch.FloatTensor(X_train.values).to(device)
y_tensor = torch.LongTensor(y_train.values).to(device)
dataset = TensorDataset(X_tensor, y_tensor)
loader = DataLoader(dataset, batch_size=64, shuffle=True, drop_last=True)

# Model definition
class TabularNet(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim, dropout=0.3):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, output_dim)
        )
    def forward(self, x):
        return self.net(x)

model = TabularNet(input_dim=X_train.shape[1], hidden_dim=256, output_dim=n_classes).to(device)
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
criterion = nn.CrossEntropyLoss()
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=100)

# Training
best_val_loss = float('inf')
patience_counter = 0
PATIENCE = 10

for epoch in range(100):
    model.train()
    train_loss = 0.0
    for X_batch, y_batch in loader:
        optimizer.zero_grad()
        logits = model(X_batch)
        loss = criterion(logits, y_batch)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        train_loss += loss.item()

    train_loss /= len(loader)
    scheduler.step()

    # Validation
    model.eval()
    with torch.no_grad():
        X_val_t = torch.FloatTensor(X_val.values).to(device)
        y_val_t = torch.LongTensor(y_val.values).to(device)
        val_logits = model(X_val_t)
        val_loss = criterion(val_logits, y_val_t).item()

    metrics_log = {"epoch": epoch + 1, "train_loss": train_loss, "val_loss": val_loss}
    print(json.dumps(metrics_log))   # Parsed by LogMonitor

    # Early stopping
    if val_loss < best_val_loss:
        best_val_loss = val_loss
        patience_counter = 0
        torch.save(model.state_dict(), 'best_model.pt')
    else:
        patience_counter += 1
        if patience_counter >= PATIENCE:
            print(json.dumps({"epoch": epoch + 1, "event": "early_stopping", "reason": "val_loss_plateau"}))
            break
```

---

## Learning Rate Scheduling

```python
# ReduceLROnPlateau: Reduce LR when metric stops improving
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode='min', factor=0.5, patience=5, verbose=True
)
# Call after validation: scheduler.step(val_loss)

# CosineAnnealingLR: Smooth LR decay
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=num_epochs)

# OneCycleLR: Super-convergence, great for tabular data
scheduler = torch.optim.lr_scheduler.OneCycleLR(
    optimizer, max_lr=1e-2, steps_per_epoch=len(loader), epochs=num_epochs
)
# Call after each batch: scheduler.step()
```

---

## Loss Functions

```python
# Classification
nn.CrossEntropyLoss()                           # Multi-class (includes softmax)
nn.BCEWithLogitsLoss()                          # Binary (more stable than BCE + Sigmoid)
nn.BCEWithLogitsLoss(pos_weight=torch.tensor([ratio]))  # For imbalanced binary

# Regression
nn.MSELoss()                                    # Mean squared error
nn.L1Loss()                                     # Mean absolute error (robust to outliers)
nn.HuberLoss(delta=1.0)                         # Combines MSE + MAE (best for outliers)
nn.SmoothL1Loss()                               # Alias for HuberLoss
```

---

## Regularization

```python
# Weight decay (L2) in optimizer
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)

# Dropout layers in model (applied during training only)
nn.Dropout(p=0.3)

# Gradient clipping (prevents exploding gradients)
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

# Batch Normalization (stabilises training, acts as regularizer)
nn.BatchNorm1d(num_features)
```

---

## Saving and Loading Models

```python
# Save checkpoint
torch.save({
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'val_loss': val_loss,
}, 'checkpoint.pt')

# Load checkpoint
checkpoint = torch.load('checkpoint.pt', map_location=device)
model.load_state_dict(checkpoint['model_state_dict'])

# Save model only (for inference)
torch.save(model.state_dict(), 'model.pt')
model.load_state_dict(torch.load('model.pt', map_location='cpu'))
model.eval()
```

---

## GPU Acceleration

```python
# Check availability
print(torch.cuda.is_available())           # NVIDIA CUDA
print(torch.backends.mps.is_available())   # Apple Silicon MPS

# Mixed precision training (2x speedup on CUDA)
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()
for X_batch, y_batch in loader:
    optimizer.zero_grad()
    with autocast():
        logits = model(X_batch)
        loss = criterion(logits, y_batch)
    scaler.scale(loss).backward()
    scaler.unscale_(optimizer)
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    scaler.step(optimizer)
    scaler.update()
```

---

## Common Pitfalls

1. **Forgetting `model.eval()` during validation** — BatchNorm and Dropout behave differently in eval mode
2. **Forgetting `with torch.no_grad():`** during validation — wastes memory computing gradients
3. **Not moving data to device** — silently runs on CPU if tensors not `.to(device)`
4. **NaN loss** — caused by: learning rate too high, missing data not properly handled, log(0), division by zero. Fix: clip gradients, reduce LR, add epsilon
5. **Data not normalised** — neural networks need StandardScaler; unnormalised features cause NaN early
