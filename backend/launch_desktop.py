"""PyInstaller entry point. Kept outside the package so lap_analyzer's relative imports work."""

from lap_analyzer.desktop import main

if __name__ == "__main__":
    main()
