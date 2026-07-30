import torch
import sys

def inspect_pt(path):
    print(f"Inspecting: {path}")
    try:
        ckpt = torch.load(path, map_location="cpu", weights_only=False)
        print("\n--- ROOT KEYS ---")
        if isinstance(ckpt, dict):
            for k in ckpt.keys():
                print(f"- {k}")
                
            if 'results_dict' in ckpt:
                print("\n--- RESULTS DICT ---")
                for k, v in ckpt['results_dict'].items():
                    print(f"{k}: {v}")
            else:
                print("\nNo 'results_dict' found in root.")
                
            if 'model' in ckpt:
                model = ckpt['model']
                print("\n--- MODEL ATTRIBUTES ---")
                if hasattr(model, 'names'):
                    print(f"names: {model.names}")
                else:
                    print("No 'names' found in model.")
                    
                # Look for metrics in model attributes
                has_metrics = False
                for attr in dir(model):
                    if 'metric' in attr.lower():
                        has_metrics = True
                        print(f"Found metric attribute: {attr}")
                if not has_metrics:
                    print("No metrics-like attributes found in model.")
                    
        else:
            print("Checkpoint is not a dictionary.")
    except Exception as e:
        print(f"Error loading checkpoint: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        inspect_pt(sys.argv[1])
    else:
        print("Please provide a path to .pt file")
