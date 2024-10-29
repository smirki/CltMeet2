import os
import logging
from typing import List, Set
from pathlib import Path

class FileCollector:
    def __init__(self, skip_dirs: List[str], skip_files: List[str], output_file: str):
        """
        Initialize the FileCollector with configuration settings.
        
        Args:
            skip_dirs (List[str]): List of directory paths to skip
            skip_files (List[str]): List of filenames to skip
            output_file (str): Path to the output file
        """
        self.skip_dirs = set(os.path.normpath(d) for d in skip_dirs)
        self.skip_files = set(skip_files)
        self.output_file = output_file
        self.script_path = Path(__file__).resolve()
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

    def should_skip_directory(self, dir_path: str) -> bool:
        """
        Check if a directory should be skipped.
        
        Args:
            dir_path (str): Directory path to check
            
        Returns:
            bool: True if directory should be skipped
        """
        normalized_path = os.path.normpath(dir_path)
        return any(normalized_path.startswith(skip_dir) for skip_dir in self.skip_dirs)

    def collect_contents(self, directory: str) -> None:
        """
        Collect contents of files in the given directory, respecting skip rules.
        
        Args:
            directory (str): Root directory to start collection from
        """
        try:
            with open(self.output_file, 'w', encoding='utf-8') as out_file:
                for root, dirs, files in os.walk(directory):
                    # Remove directories that should be skipped
                    dirs[:] = [d for d in dirs if not self.should_skip_directory(os.path.join(root, d))]
                    
                    for file in files:
                        self._process_file(root, file, out_file)
                        
            self.logger.info(f"Successfully wrote contents to {self.output_file}")
            
        except Exception as e:
            self.logger.error(f"Error during collection: {e}")
            raise

    def _process_file(self, root: str, filename: str, out_file) -> None:
        """
        Process a single file and write its contents to the output file.
        
        Args:
            root (str): Root directory containing the file
            filename (str): Name of the file to process
            out_file: File object for writing output
        """
        if filename in self.skip_files:
            return

        file_path = Path(root) / filename
        if file_path.resolve() == self.script_path:
            return

        try:
            self.logger.debug(f"Processing file: {file_path}")
            
            out_file.write(f"{'='*80}\n")
            out_file.write(f"Path: {file_path}\n")
            out_file.write(f"Directory: {root}\n")
            out_file.write(f"{'='*80}\n")
            out_file.write("Contents:\n")
            
            # Try to read the file with multiple encodings
            encodings = ['utf-8', 'latin-1', 'cp1252']
            content = None
            
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                    break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                out_file.write(f"Error: Unable to read file with supported encodings\n")
            else:
                out_file.write(content)
            
            out_file.write("\n\n")
            
        except Exception as e:
            self.logger.error(f"Error processing {file_path}: {e}")
            out_file.write(f"Error reading file: {e}\n\n")

def main():
    # Get the current directory where the script is located
    start_directory = Path(__file__).parent.resolve()
    
    # Output file
    output_file = 'output.txt'
    
    # List of directories to skip
    skip_directories = [
        start_directory / d for d in [
            'node_modules',
            'backend/test',
            'assets',
            'utils',
            '.git',
            '.expo'
        ]
    ]
    
    # List of files to skip
    skip_files = [
        'output.txt',
        'package.json',
        'package-lock.json',
        'generated_documentation.txt',
        'docker-compose.yml',
        'babel.config.js'
    ]
    
    collector = FileCollector(skip_directories, skip_files, output_file)
    collector.collect_contents(str(start_directory))

if __name__ == "__main__":
    main()