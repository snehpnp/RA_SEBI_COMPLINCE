import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface TranscribeSegment {
  time: string;
  seconds: number;
  text: string;
}

export interface TranscribeResult {
  success: boolean;
  text: string;
  duration?: number;
  segments?: TranscribeSegment[];
  error?: string;
}

export const transcribeAudioFile = (absoluteFilePath: string): Promise<TranscribeResult> => {
  return new Promise((resolve) => {
    let pythonScriptPath = path.resolve(__dirname, 'transcribe.py');
    if (!fs.existsSync(pythonScriptPath)) {
      const srcPath = path.resolve(__dirname, '../../src/utils/transcribe.py');
      if (fs.existsSync(srcPath)) {
        pythonScriptPath = srcPath;
      }
    }
    const pythonProcess = spawn('python', [pythonScriptPath, absoluteFilePath], {
      windowsHide: true
    });

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString('utf-8');
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString('utf-8');
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.warn(`[Speech-to-Text] Process exited with code ${code}. Error: ${stderrData}`);
        return resolve({
          success: false,
          text: '',
          error: stderrData || `Transcriber exited with code ${code}`
        });
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve({
          success: parsed.success,
          text: parsed.text || '',
          duration: parsed.duration,
          segments: parsed.segments || [],
          error: parsed.error
        });
      } catch (parseErr: any) {
        console.warn(`[Speech-to-Text] JSON parse error:`, parseErr, stdoutData);
        resolve({
          success: false,
          text: stdoutData.trim(),
          error: parseErr.message
        });
      }
    });

    pythonProcess.on('error', (err) => {
      console.warn(`[Speech-to-Text] Spawn error:`, err);
      resolve({
        success: false,
        text: '',
        error: err.message
      });
    });

    // Timeout safety: 45 seconds maximum for audio processing
    setTimeout(() => {
      try {
        pythonProcess.kill();
      } catch (e) {}
      resolve({
        success: false,
        text: '',
        error: 'Audio transcription timed out after 45s'
      });
    }, 45000);
  });
};
