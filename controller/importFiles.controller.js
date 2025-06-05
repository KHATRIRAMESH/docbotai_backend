import fs from 'fs';
import path from 'path';

export async function showHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const excelDir = 'F:\\NextJS Workspace\\DocBot\\docbotai_backend\\temp\\excel';
  
    if (!fs.existsSync(excelDir)) {
      return res.status(200).json({ files: [] });
    }

    const files = fs.readdirSync(excelDir)
      .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
      .map(filename => {
        const filePath = path.join(excelDir, filename);
        const stats = fs.statSync(filePath);
        
        return {
          name: filename,
          url: `http://localhost:8000/temp/excel/${filename}`,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          fullPath: filePath
        };
      });

    res.status(200).json({ files });
  } catch (error) {
    console.error('Error reading Excel files:', error);
    res.status(500).json({ message: 'Failed to fetch Excel files' });
  }
}

export async function renameHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { oldName, newName, filePath } = req.body;
  
  try {
    const dir = path.dirname(filePath);
    const oldPath = path.join(dir, oldName);
    const newPath = path.join(dir, newName);
    
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      res.status(200).json({ message: 'File renamed successfully' });
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to rename file' });
  }
}

export  async function deleteHandler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { fileName, filePath } = req.body;
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.status(200).json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete file' });
  }
}