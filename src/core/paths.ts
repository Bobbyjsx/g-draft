import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export class PathManager {
  private baseDir: string;
  private projectsDir: string;

  constructor() {
    this.baseDir = path.join(os.homedir(), '.gdraft');
    this.projectsDir = path.join(this.baseDir, 'projects');
    this.ensureBaseDirs();
  }

  private ensureBaseDirs() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      if (!fs.existsSync(this.projectsDir)) {
        fs.mkdirSync(this.projectsDir, { recursive: true });
      }
    } catch (e) {
      console.error(`Failed to create base directories: ${e}`);
    }
  }

  getProjectDir(projectPath: string = process.cwd()): string {
    const absolutePath = path.resolve(projectPath);
    // Create a unique ID for the project based on its absolute path
    const projectId = crypto.createHash('md5').update(absolutePath).digest('hex').substring(0, 12);
    const dir = path.join(this.projectsDir, projectId);

    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        // Create a metadata file to know which path this hash belongs to
        fs.writeFileSync(path.join(dir, 'project.info'), absolutePath);
      } catch (e) {
        // Fallback or silent fail
      }
    }

    return dir;
  }

  getLogsDir(projectPath: string = process.cwd()): string {
    const dir = path.join(this.getProjectDir(projectPath), 'logs');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        // Fallback
      }
    }
    return dir;
  }

  getCachePath(projectPath: string = process.cwd()): string {
    return path.join(this.getProjectDir(projectPath), 'cache.json');
  }
}

export const paths = new PathManager();
