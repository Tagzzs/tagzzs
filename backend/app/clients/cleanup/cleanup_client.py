"""
Cache Cleanup and System Initialization Utilities

Provides utilities for:
- Cleaning Python bytecode caches (__pycache__)
- Resetting singleton instances
- CUDA memory cleanup
- Proper application restart procedures
"""

import os
import shutil
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def clean_pycache(root_path: str = ".") -> int:
    """
    Recursively remove all __pycache__ directories.

    Args:
        root_path: Root directory to clean from (default: current directory)

    Returns:
        Number of __pycache__ directories removed
    """
    removed_count = 0
    for pycache_dir in Path(root_path).rglob("__pycache__"):
        try:
            shutil.rmtree(pycache_dir)
            logger.info(f"Removed __pycache__: {pycache_dir}")
            removed_count += 1
        except Exception as e:
            logger.warning(f"Failed to remove {pycache_dir}: {e}")

    return removed_count


def clean_pyc_files(root_path: str = ".") -> int:
    """
    Remove all .pyc files.

    Args:
        root_path: Root directory to clean from

    Returns:
        Number of .pyc files removed
    """
    removed_count = 0
    for pyc_file in Path(root_path).rglob("*.pyc"):
        try:
            os.remove(pyc_file)
            logger.info(f"Removed .pyc: {pyc_file}")
            removed_count += 1
        except Exception as e:
            logger.warning(f"Failed to remove {pyc_file}: {e}")

    return removed_count


def reset_all_singletons():
    """
    Reset all singleton instances for fresh initialization.
    Useful for reloading models and clearing memory.
    """
    try:
        from ..classifier.classifier_client import (
            reset_classifier,
        )
        from ..image_engine.image_engine_client import (
            reset_image_engine,
        )

        logger.info("Resetting all singleton instances...")

        # Reset classifier
        try:
            reset_classifier()
            logger.info("✅ Classifier reset")
        except Exception as e:
            logger.warning(f"Failed to reset classifier: {e}")

        # Reset image engine
        try:
            reset_image_engine()
            logger.info("✅ Image engine reset")
        except Exception as e:
            logger.warning(f"Failed to reset image engine: {e}")

    except ImportError as e:
        logger.warning(f"Could not import clients for reset: {e}")


def cleanup_cuda_memory():
    """
    Force CUDA memory cleanup.
    Useful before heavy operations or when experiencing memory issues.
    """
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.reset_peak_memory_stats()
            logger.info("✅ CUDA memory cleaned")
        else:
            logger.info("CUDA not available, skipping cleanup")
    except Exception as e:
        logger.warning(f"Failed to cleanup CUDA memory: {e}")


def full_cleanup():
    """
    Perform full cleanup:
    1. Reset all singletons
    2. Clean CUDA memory
    3. (Optional) Clean Python caches
    """
    logger.info("Starting full cleanup...")
    reset_all_singletons()
    cleanup_cuda_memory()
    logger.info("✅ Full cleanup completed")


def suggest_restart():
    """
    Print restart instructions for the application.
    """
    print("\n" + "=" * 60)
    print("RECOMMENDED: Restart the application for full effect")
    print("=" * 60)
    print("\nOptions:")
    print("1. Restart FastAPI server:")
    print("   pkill -f 'python.*main.py'")
    print("   python3 main.py")
    print("\n2. Or in your current terminal:")
    print("   # Press Ctrl+C, then:")
    print("   python3 main.py")
    print("\n" + "=" * 60 + "\n")


if __name__ == "__main__":
    """
    Run cleanup utilities from command line.
    
    Usage:
        python -m pipelines.clients.cleanup [options]
    
    Options:
        --pycache          Remove __pycache__ directories
        --pyc              Remove .pyc files
        --singletons       Reset all singleton instances
        --cuda             Cleanup CUDA memory
        --full             Do all cleanup operations
    """
    import argparse

    parser = argparse.ArgumentParser(
        description="Cache and singleton cleanup utilities"
    )
    parser.add_argument(
        "--pycache", action="store_true", help="Remove __pycache__ directories"
    )
    parser.add_argument("--pyc", action="store_true", help="Remove .pyc files")
    parser.add_argument(
        "--singletons", action="store_true", help="Reset all singletons"
    )
    parser.add_argument("--cuda", action="store_true", help="Cleanup CUDA memory")
    parser.add_argument("--full", action="store_true", help="Do all cleanup operations")

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    if args.full or not any(vars(args).values()):
        if args.pycache or args.full:
            count = clean_pycache()

        if args.pyc or args.full:
            count = clean_pyc_files()

        if args.singletons or args.full:
            reset_all_singletons()

        if args.cuda or args.full:
            cleanup_cuda_memory()

        suggest_restart()
    else:
        if args.pycache:
            count = clean_pycache()

        if args.pyc:
            count = clean_pyc_files()

        if args.singletons:
            reset_all_singletons()

        if args.cuda:
            cleanup_cuda_memory()
