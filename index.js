const sharp = require('sharp');
const potrace = require('potrace');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { promisify } = require('util');
const archiver = require('archiver');

const app = express();
const upload = multer({ dest: 'input/' });
const trace = promisify(potrace.trace);

app.use(express.static('public'));

// Update convertToSVG function (around lines 14-30)
async function convertToSVG(inputPath, outputPath, options) {
    try {
      const { smoothness, noise, blur, width, height } = options;
      const image = await sharp(inputPath)
        .grayscale()
        .resize({
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
          fit: 'inside', // Scale to fit within dimensions, preserving aspect ratio
          withoutEnlargement: true // Don’t upscale if smaller
        })
        .blur(parseFloat(blur))
        .normalize()
        .linear(1.2, 0)
        .toBuffer();
  
      const svg = await trace(image, {
        turdSize: parseInt(noise),
        alphaMax: parseFloat(smoothness),
        optTolerance: 0.4,
      });
  
      fs.writeFileSync(outputPath, svg);
      return svg;
    } catch (error) {
      console.error(`Error converting ${inputPath}:`, error.message);
      throw error;
    }
  }
  
  // Update app.post('/convert') (around lines 35-65)
  app.post('/convert', upload.array('images'), async (req, res) => {
    const files = req.files;
    const options = {
      smoothness: req.body.smoothness || '0.8',
      noise: req.body.noise || '2',
      blur: req.body.blur || '0.5',
      width: req.body.width || null, // Optional width
      height: req.body.height || null // Optional height
    };
  
    try {
      const outputDir = path.join(__dirname, 'output');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  
      if (files.length <= 2) {
        const svgContents = [];
        for (const file of files) {
          const inputPath = file.path;
          const outputPath = path.join(outputDir, `${file.filename}.svg`);
          const svgContent = await convertToSVG(inputPath, outputPath, options);
          svgContents.push(svgContent);
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        }
        res.set('Content-Type', 'image/svg+xml');
        res.send(svgContents.join('|||'));
      } else {
        const svgFiles = [];
        for (const file of files) {
          const inputPath = file.path;
          const outputPath = path.join(outputDir, `${file.filename}.svg`);
          await convertToSVG(inputPath, outputPath, options);
          svgFiles.push({ path: outputPath, name: file.originalname.replace('.png', '.svg') });
          fs.unlinkSync(inputPath);
        }
  
        const archive = archiver('zip', { zlib: { level: 9 } });
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename="vectorcraft_svgs.zip"');
        archive.pipe(res);
  
        svgFiles.forEach(file => {
          archive.file(file.path, { name: file.name });
        });
  
        archive.on('error', (err) => { throw err; });
        await archive.finalize();
  
        svgFiles.forEach(file => fs.unlinkSync(file.path));
      }
    } catch (error) {
      res.status(500).send('Conversion failed');
    }
  });
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`VectorCraft server running at http://localhost:${PORT}`);
});