import { exec } from 'child_process';
import path from 'path';

const updateMetadata = () => {
  const scriptPath = path.join(process.cwd(), 'scripts', 's3_handler.py');
  
  exec(`python ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
};

// Update immediately
updateMetadata();

// Update every hour
setInterval(updateMetadata, 60 * 60 * 1000);