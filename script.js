document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const mainDisplay = document.getElementById('main-display');
    const displayHex = document.getElementById('display-hex');
    const displayRgb = document.getElementById('display-rgb');
    
    const colorPicker = document.getElementById('color-picker');
    const hexInput = document.getElementById('hex-input');
    const rgbR = document.getElementById('rgb-r');
    const rgbG = document.getElementById('rgb-g');
    const rgbB = document.getElementById('rgb-b');
    const btnRandom = document.getElementById('btn-random');

    const selectedCount = document.getElementById('selected-count');
    const btnClearSelection = document.getElementById('btn-clear-selection');
    const btnOpenConverter = document.getElementById('btn-open-converter');
    
    const converterModal = document.getElementById('converter-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');

    const codeCss = document.getElementById('code-css');
    const codeFlutter = document.getElementById('code-flutter');
    const codeSwiftui = document.getElementById('code-swiftui');
    const codeAndroid = document.getElementById('code-android');

    const toast = document.getElementById('toast');

    // --- Core State ---
    let currentColor = { r: 99, g: 102, b: 241 }; // Initial #6366F1
    let selectedColors = []; // Array of hex strings

    // --- Color Math Helpers ---
    function rgbToHex(r, g, b) {
        return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
    }

    function hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function rgbToHsl(r, g, b) {
        r /= 255, g /= 255, b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function hslToRgb(h, s, l) {
        let r, g, b;
        h /= 360; s /= 100; l /= 100;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    // --- Update UI ---
    function updateAll(source) {
        let hex = rgbToHex(currentColor.r, currentColor.g, currentColor.b);
        let rgbString = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;

        // Update Main Display
        mainDisplay.style.backgroundColor = hex;
        displayHex.innerText = hex;
        displayRgb.innerText = rgbString;
        
        // Adjust text color based on luminance
        const lum = (0.299*currentColor.r + 0.587*currentColor.g + 0.114*currentColor.b)/255;
        mainDisplay.style.color = lum > 0.5 ? '#000000' : '#ffffff';

        // Update Inputs (prevent loop)
        if (source !== 'picker') colorPicker.value = hex;
        if (source !== 'hex') hexInput.value = hex;
        if (source !== 'rgb') {
            rgbR.value = currentColor.r;
            rgbG.value = currentColor.g;
            rgbB.value = currentColor.b;
        }

        // Generate Palettes based on current HSL
        const hsl = rgbToHsl(currentColor.r, currentColor.g, currentColor.b);
        generatePalettes(hsl);
        generateShadesAndTints(currentColor);
    }

    // --- Selection UI ---
    const selectionBar = document.getElementById('selection-bar');
    const selectedColorsPreview = document.getElementById('selected-colors-preview');

    function updateSelectionStats() {
        selectedCount.innerText = `${selectedColors.length} Selected`;
        if (selectedColors.length > 0) {
            selectionBar.style.display = 'flex';
        } else {
            selectionBar.style.display = 'none';
        }
        
        selectedColorsPreview.innerHTML = '';
        selectedColors.forEach(hex => {
            const swatch = document.createElement('div');
            swatch.className = 'mini-swatch';
            swatch.style.backgroundColor = hex;
            swatch.title = hex;
            swatch.addEventListener('click', () => {
                toggleSelection(hex);
            });
            selectedColorsPreview.appendChild(swatch);
        });
    }

    function toggleSelection(hex) {
        const idx = selectedColors.indexOf(hex);
        const isNowSelected = idx === -1;
        
        if (isNowSelected) {
            selectedColors.push(hex);
        } else {
            selectedColors.splice(idx, 1);
        }
        
        document.querySelectorAll('.color-swatch').forEach(el => {
            if (el.dataset.hex === hex) {
                if (isNowSelected) el.classList.add('selected');
                else el.classList.remove('selected');
            }
        });
        updateSelectionStats();
    }

    // --- Shades & Tints ---
    function generateShadesAndTints(rgb) {
        const container = document.getElementById('shades-container');
        container.innerHTML = '';
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        
        let colors = [];
        for (let i = 9; i >= 0; i--) {
            let l = 5 + (i * 10);
            colors.push({h: hsl.h, s: hsl.s, l: Math.min(100, Math.max(0, l))});
        }
        
        colors.forEach(c => {
            const trgb = hslToRgb(c.h, c.s, c.l);
            const hex = rgbToHex(trgb.r, trgb.g, trgb.b);
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.dataset.hex = hex;
            swatch.style.backgroundColor = hex;
            
            if (selectedColors.includes(hex)) swatch.classList.add('selected');

            swatch.innerHTML = `
                <div class="swatch-overlay">
                    <button class="swatch-action action-copy" data-hex="${hex}"><i class="fa-regular fa-copy"></i></button>
                    <button class="swatch-action action-select" data-hex="${hex}"><i class="fa-solid fa-check"></i></button>
                </div>
            `;
            swatch.querySelector('.action-copy').addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(hex);
                showToast('Copied: ' + hex);
            });
            swatch.querySelector('.action-select').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSelection(hex);
            });
            
            container.appendChild(swatch);
        });
    }

    // --- Palette Generation ---
    function generatePalettes(baseHsl) {
        const {h, s, l} = baseHsl;

        const createSwatches = (hslArray, containerId) => {
            const container = document.getElementById(containerId);
            container.innerHTML = '';
            
            hslArray.forEach(color => {
                const rgb = hslToRgb(color.h, color.s, color.l);
                const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                const lum = (0.299*rgb.r + 0.587*rgb.g + 0.114*rgb.b)/255;
                
                const swatch = document.createElement('div');
                swatch.className = 'color-swatch';
                swatch.dataset.hex = hex;
                if (selectedColors.includes(hex)) {
                    swatch.classList.add('selected');
                }
                
                swatch.style.backgroundColor = hex;
                swatch.style.color = lum > 0.5 ? '#000' : '#fff';
                
                swatch.innerHTML = `
                    <span class="swatch-text">${hex}</span>
                    <div class="swatch-overlay">
                        <button class="swatch-action action-copy"><i class="fa-regular fa-copy"></i> Copy</button>
                        <button class="swatch-action action-select"><i class="fa-solid fa-check"></i> Select</button>
                        <button class="swatch-action action-main"><i class="fa-solid fa-star"></i> Main</button>
                    </div>
                `;
                
                swatch.querySelector('.action-copy').addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(hex);
                    showToast('Copied: ' + hex);
                });
                
                swatch.querySelector('.action-select').addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleSelection(hex);
                });

                swatch.querySelector('.action-main').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newRgb = hexToRgb(hex);
                    if(newRgb) {
                        currentColor = newRgb;
                        updateAll('manual');
                    }
                });
                
                container.appendChild(swatch);
            });
        };

        // Monochromatic
        let mono = [
            {h, s, l: Math.max(0, l - 40)},
            {h, s, l: Math.max(0, l - 20)},
            {h, s, l},
            {h, s, l: Math.min(100, l + 20)},
            {h, s, l: Math.min(100, l + 40)},
        ];

        // Analogous
        let analogous = [
            {h: (h - 60 + 360) % 360, s, l},
            {h: (h - 30 + 360) % 360, s, l},
            {h, s, l},
            {h: (h + 30) % 360, s, l},
            {h: (h + 60) % 360, s, l},
        ];

        // Complementary & Split
        let comp = [
            {h, s, l},
            {h: (h + 150) % 360, s, l},
            {h: (h + 180) % 360, s, l}, 
            {h: (h + 210) % 360, s, l},
            {h: (h + 180) % 360, s, l: Math.min(100, l+20)},
        ];

        // Triadic
        let triadic = [
            {h, s, l: Math.min(100, l+10)},
            {h, s, l},
            {h: (h + 120) % 360, s, l},
            {h: (h + 240) % 360, s, l},
            {h: (h + 240) % 360, s, l: Math.max(0, l-15)},
        ];

        createSwatches(mono, 'palette-mono');
        createSwatches(analogous, 'palette-analogous');
        createSwatches(comp, 'palette-complementary');
        createSwatches(triadic, 'palette-triadic');
    }

    // --- Modal & Code Generation ---
    function generateModalCode() {
        if (selectedColors.length === 0) return;

        if (selectedColors.length === 1) {
            const hex = selectedColors[0];
            const rgb = hexToRgb(hex);
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            
            codeCss.innerText = `/* HEX */\ncolor: ${hex};\n/* RGB */\ncolor: rgb(${rgb.r}, ${rgb.g}, ${rgb.b});\n/* HSL */\ncolor: hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%);`;
            codeFlutter.innerText = `Color(0xFF${hex.replace('#', '')})`;
            codeSwiftui.innerText = `Color(red: ${(rgb.r/255).toFixed(3)}, green: ${(rgb.g/255).toFixed(3)}, blue: ${(rgb.b/255).toFixed(3)})`;
            codeAndroid.innerText = `<!-- values/colors.xml -->\n<color name="color_1">#FF${hex.replace('#', '')}</color>`;
        } else {
            // Arrays/Lists for Multiple Colors
            let cssOutput = `:root {\n`;
            let flutterOutput = `List<Color> palette = [\n`;
            let swiftOutput = `let palette = [\n`;
            let androidOutput = `<!-- values/colors.xml -->\n`;

            selectedColors.forEach((hex, i) => {
                const rgb = hexToRgb(hex);
                const num = i + 1;
                
                // CSS Variables
                cssOutput += `  --color-${num}: ${hex};\n`;
                
                // Flutter List
                flutterOutput += `  Color(0xFF${hex.replace('#', '')})${i < selectedColors.length - 1 ? ',' : ''}\n`;
                
                // SwiftUI Array
                swiftOutput += `  Color(red: ${(rgb.r/255).toFixed(3)}, green: ${(rgb.g/255).toFixed(3)}, blue: ${(rgb.b/255).toFixed(3)})${i < selectedColors.length - 1 ? ',' : ''}\n`;
                
                // Android XML
                androidOutput += `<color name="color_${num}">#FF${hex.replace('#', '')}</color>\n`;
            });

            cssOutput += `}`;
            flutterOutput += `];`;
            swiftOutput += `]`;

            codeCss.innerText = cssOutput;
            codeFlutter.innerText = flutterOutput;
            codeSwiftui.innerText = swiftOutput;
            codeAndroid.innerText = androidOutput;
        }
    }

    btnOpenConverter.addEventListener('click', () => {
        generateModalCode();
        converterModal.classList.add('show');
    });

    btnCloseModal.addEventListener('click', () => {
        converterModal.classList.remove('show');
    });
    
    // Close modal on click outside
    converterModal.addEventListener('click', (e) => {
        if (e.target === converterModal) {
            converterModal.classList.remove('show');
        }
    });

    btnClearSelection.addEventListener('click', () => {
        selectedColors = [];
        document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('selected'));
        updateSelectionStats();
    });

    // --- Input Event Listeners ---
    colorPicker.addEventListener('input', (e) => {
        const rgb = hexToRgb(e.target.value);
        if (rgb) {
            currentColor = rgb;
            updateAll('picker');
        }
    });

    hexInput.addEventListener('input', (e) => {
        let val = e.target.value;
        if (!val.startsWith('#')) val = '#' + val;
        const rgb = hexToRgb(val);
        if (rgb) {
            currentColor = rgb;
            updateAll('hex');
        }
    });

    const updateFromRgb = () => {
        let r = Math.min(255, Math.max(0, parseInt(rgbR.value) || 0));
        let g = Math.min(255, Math.max(0, parseInt(rgbG.value) || 0));
        let b = Math.min(255, Math.max(0, parseInt(rgbB.value) || 0));
        currentColor = { r, g, b };
        updateAll('rgb');
    };

    rgbR.addEventListener('input', updateFromRgb);
    rgbG.addEventListener('input', updateFromRgb);
    rgbB.addEventListener('input', updateFromRgb);

    btnRandom.addEventListener('click', () => {
        currentColor = {
            r: Math.floor(Math.random() * 256),
            g: Math.floor(Math.random() * 256),
            b: Math.floor(Math.random() * 256)
        };
        updateAll('random');
    });

    // Copy Buttons for Code
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const codeEl = document.getElementById(targetId);
            navigator.clipboard.writeText(codeEl.innerText).then(() => {
                showToast('Code copied to clipboard!');
            });
        });
    });

    function showToast(msg) {
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // --- Contrast Checker ---
    const contrastBg = document.getElementById('contrast-bg');
    const contrastFg = document.getElementById('contrast-fg');
    const contrastPreview = document.getElementById('contrast-preview');
    const contrastRatioEl = document.getElementById('contrast-ratio');
    const contrastAa = document.getElementById('contrast-aa');
    const contrastAaa = document.getElementById('contrast-aaa');

    function getLuminance(r, g, b) {
        let a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function calculateContrastRatio(l1, l2) {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    function updateContrast() {
        const bgHex = contrastBg.value;
        const fgHex = contrastFg.value;
        
        contrastPreview.style.backgroundColor = bgHex;
        contrastPreview.style.color = fgHex;
        
        const bgRgb = hexToRgb(bgHex);
        const fgRgb = hexToRgb(fgHex);
        
        if(bgRgb && fgRgb) {
            const l1 = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
            const l2 = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
            const ratio = calculateContrastRatio(l1, l2);
            
            contrastRatioEl.innerText = ratio.toFixed(2) + ':1';
            
            const passAA = ratio >= 4.5;
            const passAAA = ratio >= 7.0;
            
            contrastAa.className = 'badge ' + (passAA ? 'pass' : 'fail');
            contrastAa.innerText = passAA ? 'Pass' : 'Fail';
            
            contrastAaa.className = 'badge ' + (passAAA ? 'pass' : 'fail');
            contrastAaa.innerText = passAAA ? 'Pass' : 'Fail';
        }
    }

    contrastBg.addEventListener('input', updateContrast);
    contrastFg.addEventListener('input', updateContrast);
    
    updateContrast();

    // --- Image Palette Extractor ---
    const imageUpload = document.getElementById('image-upload');
    const imageCanvas = document.getElementById('image-canvas');
    const imagePreview = document.getElementById('image-preview');
    const imagePlaceholder = document.getElementById('image-placeholder');
    const paletteExtracted = document.getElementById('palette-extracted');

    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
                imagePlaceholder.style.display = 'none';
                
                extractPaletteFromImage(img);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    function extractPaletteFromImage(img) {
        const ctx = imageCanvas.getContext('2d');
        const maxDim = 200;
        let width = img.width;
        let height = img.height;
        if(width > maxDim || height > maxDim) {
            if(width > height) {
                height = Math.round(height * maxDim / width);
                width = maxDim;
            } else {
                width = Math.round(width * maxDim / height);
                height = maxDim;
            }
        }
        imageCanvas.width = width;
        imageCanvas.height = height;
        // Fill white background for transparent images
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height).data;
        
        // simple grid sampling
        const colors = [];
        const step = Math.floor((imageData.length / 4) / 5);
        for(let i=0; i<5; i++) {
            const offset = (i * step + Math.floor(step/2)) * 4;
            if(offset < imageData.length) {
                colors.push({
                    r: imageData[offset],
                    g: imageData[offset+1],
                    b: imageData[offset+2]
                });
            }
        }
        
        paletteExtracted.innerHTML = '';
        colors.forEach(rgb => {
            const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            const lum = (0.299*rgb.r + 0.587*rgb.g + 0.114*rgb.b)/255;
            
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.dataset.hex = hex;
            if (selectedColors.includes(hex)) {
                swatch.classList.add('selected');
            }
            
            swatch.style.backgroundColor = hex;
            swatch.style.color = lum > 0.5 ? '#000' : '#fff';
            
            swatch.innerHTML = `
                <span class="swatch-text">${hex}</span>
                <div class="swatch-overlay">
                    <button class="swatch-action action-copy"><i class="fa-regular fa-copy"></i> Copy</button>
                    <button class="swatch-action action-select"><i class="fa-solid fa-check"></i> Select</button>
                    <button class="swatch-action action-main"><i class="fa-solid fa-star"></i> Main</button>
                </div>
            `;
            
            swatch.querySelector('.action-copy').addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(hex);
                showToast('Copied: ' + hex);
            });
            
            swatch.querySelector('.action-select').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSelection(hex);
            });

            swatch.querySelector('.action-main').addEventListener('click', (e) => {
                e.stopPropagation();
                const newRgb = hexToRgb(hex);
                if(newRgb) {
                    currentColor = newRgb;
                    updateAll('manual');
                }
            });
            
            paletteExtracted.appendChild(swatch);
        });
    }

    // --- Gradient Maker ---
    const gradColor1 = document.getElementById('grad-color1');
    const gradColor2 = document.getElementById('grad-color2');
    const gradAngle = document.getElementById('grad-angle');
    const gradAngleVal = document.getElementById('grad-angle-val');
    const gradientPreview = document.getElementById('gradient-preview');
    const codeGradient = document.getElementById('code-gradient');

    function updateGradient() {
        const c1 = gradColor1.value;
        const c2 = gradColor2.value;
        const angle = gradAngle.value;
        if(gradAngleVal) gradAngleVal.innerText = angle;
        
        const css = `background: linear-gradient(${angle}deg, ${c1}, ${c2});`;
        if(gradientPreview) gradientPreview.style = css + " height: 120px; border-radius:12px; border:1px solid var(--border-color); margin-bottom: 15px;";
        if(codeGradient) codeGradient.innerText = css;
    }

    if(gradColor1) gradColor1.addEventListener('input', updateGradient);
    if(gradColor2) gradColor2.addEventListener('input', updateGradient);
    if(gradAngle) gradAngle.addEventListener('input', updateGradient);
    updateGradient();

    // --- Export PNG ---
    const btnExportPng = document.getElementById('btn-export-png');
    if(btnExportPng) {
        btnExportPng.addEventListener('click', () => {
            const palettes = [
                { title: 'Monochromatic', el: document.getElementById('palette-mono') },
                { title: 'Analogous', el: document.getElementById('palette-analogous') },
                { title: 'Complementary', el: document.getElementById('palette-complementary') },
                { title: 'Triadic', el: document.getElementById('palette-triadic') }
            ];
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const width = 800;
            const height = palettes.length * 160 + 100;
            canvas.width = width;
            canvas.height = height;
            
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '28px sans-serif';
            ctx.fillText('Color Master - Generated Palettes', 40, 60);
            
            let y = 100;
            palettes.forEach(pal => {
                const swatches = pal.el.querySelectorAll('.color-swatch');
                if(swatches.length === 0) return;
                
                ctx.fillStyle = '#94a3b8';
                ctx.font = '18px sans-serif';
                ctx.fillText(pal.title, 40, y);
                y += 20;
                
                const swatchW = (width - 80) / swatches.length;
                const swatchH = 100;
                
                swatches.forEach((s, idx) => {
                    ctx.fillStyle = s.dataset.hex;
                    ctx.fillRect(40 + (idx * swatchW), y, swatchW, swatchH);
                    
                    ctx.fillStyle = s.style.color || '#fff';
                    ctx.font = 'bold 16px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(s.dataset.hex, 40 + (idx * swatchW) + (swatchW/2), y + swatchH - 20);
                    ctx.textAlign = 'left';
                });
                y += swatchH + 40;
            });
            
            const link = document.createElement('a');
            link.download = 'color-master-palettes.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('Palettes exported successfully!');
        });
    }

    // Initialize
    updateAll('init');
});
