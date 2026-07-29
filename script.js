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
    }

    // --- Selection UI ---
    function updateSelectionStats() {
        selectedCount.innerText = `${selectedColors.length} Selected`;
        if (selectedColors.length > 0) {
            btnOpenConverter.disabled = false;
            btnClearSelection.style.display = 'block';
        } else {
            btnOpenConverter.disabled = true;
            btnClearSelection.style.display = 'none';
        }
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
                if (selectedColors.includes(hex)) {
                    swatch.classList.add('selected');
                }
                
                swatch.style.backgroundColor = hex;
                swatch.style.color = lum > 0.5 ? '#000' : '#fff';
                swatch.innerText = hex;
                
                // Add Tooltip
                swatch.setAttribute('data-tooltip', `${hex} | rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
                
                // Toggle selection on click
                swatch.addEventListener('click', () => {
                    const idx = selectedColors.indexOf(hex);
                    if (idx > -1) {
                        selectedColors.splice(idx, 1);
                        swatch.classList.remove('selected');
                    } else {
                        selectedColors.push(hex);
                        swatch.classList.add('selected');
                    }
                    updateSelectionStats();
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

    // Initialize
    updateAll('init');
});
