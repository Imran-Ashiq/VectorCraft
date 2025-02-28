// Replace the entire script.js with this
const sliders = ['smoothness', 'noise', 'blur'];
sliders.forEach(id => {
  const input = document.querySelector(`input[name="${id}"]`);
  const output = document.getElementById(`${id}Value`);
  input.addEventListener('input', () => {
    output.textContent = input.value;
    updateFeedback();
  });
  output.textContent = input.value;
});

const presets = {
  crisp: { smoothness: '1.2', noise: '5', blur: '0' },
  soft: { smoothness: '0.5', noise: '2', blur: '0.8' },
  minimal: { smoothness: '1.0', noise: '8', blur: '0' },
};

document.querySelector('select[name="preset"]').addEventListener('change', (e) => {
  const preset = presets[e.target.value];
  if (preset) {
    sliders.forEach(id => {
      const input = document.querySelector(`input[name="${id}"]`);
      const output = document.getElementById(`${id}Value`);
      input.value = preset[id];
      output.textContent = preset[id];
    });
    updateFeedback();
  }
});

function updateFeedback() {
  const smoothness = document.querySelector('input[name="smoothness"]').value;
  const noise = document.querySelector('input[name="noise"]').value;
  const blur = document.querySelector('input[name="blur"]').value;
  const feedback = document.getElementById('settingsFeedback');

  let smoothnessText = smoothness > 1 ? 'Sharp' : smoothness < 0.7 ? 'Smooth' : 'Balanced';
  let noiseText = noise > 7 ? 'Minimal' : noise < 3 ? 'Detailed' : 'Clean';
  let blurText = blur > 0.7 ? 'Soft' : blur < 0.3 ? 'Crisp' : 'Moderate';

  feedback.textContent = `Output: ${smoothnessText} edges, ${noiseText} detail, ${blurText} transitions`;
}

updateFeedback();

let currentZipUrl = null;
let svgContents = {};

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const statusText = document.getElementById('statusText');
  const spinner = document.getElementById('spinner');
  const preview = document.getElementById('svgPreview');
  const thumbnails = document.getElementById('thumbnails');
  const downloadBtn = document.getElementById('downloadBtn');
  const files = document.getElementById('imageInput').files;

  statusText.textContent = 'Converting...';
  spinner.style.display = 'inline-block';
  preview.innerHTML = '';
  thumbnails.innerHTML = '';
  downloadBtn.style.display = 'none';

  try {
    const response = await fetch('/convert', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      if (files.length <= 2) {
        const svgText = await response.text();
        const svgArray = svgText.split('|||');

        if (files.length === 1) {
          preview.innerHTML = svgArray[0];
          currentZipUrl = window.URL.createObjectURL(new Blob([svgArray[0]], { type: 'image/svg+xml' }));
          downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download SVG';
          statusText.textContent = 'Conversion complete! Download below.';
          downloadBtn.style.display = 'block';
        } else if (files.length === 2) {
          svgContents = {
            'image1.svg': svgArray[0],
            'image2.svg': svgArray[1]
          };

          for (const [filename, svgText] of Object.entries(svgContents)) {
            const thumb = document.createElement('div');
            thumb.className = 'thumbnail';
            thumb.innerHTML = svgText;
            thumb.dataset.filename = filename;
            thumbnails.appendChild(thumb);

            thumb.addEventListener('click', () => {
              preview.innerHTML = svgText;
              thumbnails.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
              thumb.classList.add('active');
            });

            const dlBtn = document.createElement('button');
            dlBtn.innerHTML = `<i class="fas fa-download"></i> Download ${filename}`;
            dlBtn.style.margin = '5px';
            dlBtn.addEventListener('click', () => {
              const a = document.createElement('a');
              a.href = window.URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
              a.download = filename;
              a.click();
            });
            thumbnails.appendChild(dlBtn);
          }

          preview.innerHTML = svgContents['image1.svg'];
          thumbnails.querySelector('.thumbnail').classList.add('active');
          statusText.textContent = 'Conversion complete! Click thumbnails to preview, download individually below.';
        }
      } else {
        const blob = await response.blob();
        currentZipUrl = window.URL.createObjectURL(blob);

        const zip = await new JSZip().loadAsync(blob);
        svgContents = {};
        thumbnails.innerHTML = '';

        for (const [filename, file] of Object.entries(zip.files)) {
          const svgText = await file.async('text');
          svgContents[filename] = svgText;

          const thumb = document.createElement('div');
          thumb.className = 'thumbnail';
          thumb.innerHTML = svgText;
          thumb.dataset.filename = filename;
          thumbnails.appendChild(thumb);

          thumb.addEventListener('click', () => {
            preview.innerHTML = svgText;
            thumbnails.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
          });
        }

        const firstFile = Object.keys(svgContents)[0];
        if (firstFile) {
          preview.innerHTML = svgContents[firstFile];
          thumbnails.querySelector('.thumbnail').classList.add('active');
        }
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download ZIP';
        statusText.textContent = 'Conversion complete! Click thumbnails to preview, download ZIP below.';
        downloadBtn.style.display = 'block';
      }
      spinner.style.display = 'none';
    } else {
      statusText.textContent = 'Error during conversion.';
      spinner.style.display = 'none';
    }
  } catch (error) {
    statusText.textContent = 'Something went wrong. Try again.';
    spinner.style.display = 'none';
    console.error(error);
  }
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  if (currentZipUrl) {
    const a = document.createElement('a');
    a.href = currentZipUrl;
    const fileCount = document.getElementById('imageInput').files.length;
    a.download = fileCount <= 2 ? 'converted.svg' : 'vectorcraft_svgs.zip';
    a.click();
  }
});