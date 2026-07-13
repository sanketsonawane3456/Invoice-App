// Auto-resize logic for inputs and textareas (Global scope for addRow visibility)
function createMeasureSpan() {
    let span = document.getElementById('measure-span');
    if (!span) {
        span = document.createElement('span');
        span.id = 'measure-span';
        span.style.cssText = 'position: absolute; top: -9999px; left: -9999px; white-space: pre; visibility: hidden;';
        document.body.appendChild(span);
    }
    return span;
}

function updateInputWidth(input) {
    if (input.tagName === 'SELECT') {
        const span = createMeasureSpan();
        const style = window.getComputedStyle(input);
        span.style.font = style.font;
        span.textContent = input.options[input.selectedIndex]?.text || '';
        const width = span.offsetWidth + 30; // Extra for arrow
        input.style.width = width + 'px';
        return;
    }

    if (input.tagName !== 'INPUT' || (input.type !== 'text' && input.type !== 'number' && input.type !== 'email')) return;

    const span = createMeasureSpan();
    const style = window.getComputedStyle(input);
    span.style.font = style.font;
    span.style.fontWeight = style.fontWeight;
    span.style.letterSpacing = style.letterSpacing;
    span.style.textTransform = style.textTransform;
    span.style.padding = '0';
    span.style.border = 'none';

    span.textContent = input.value || input.placeholder || '';
    // Use a slightly larger buffer and ensure it doesn't shrink too much
    const width = Math.max(input.placeholder ? 40 : 30, span.offsetWidth + 12);
    input.style.width = width + 'px';
}

function updateTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
}

function setupAutoResize() {
    // Target specific classes for inline growth
    const autoGrowInputs = document.querySelectorAll('.inline-input, .inline-responsive-input, .footer-input');
    autoGrowInputs.forEach(input => {
        if (!input.dataset.autoGrow) {
            input.dataset.autoGrow = "true";
            const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
            input.addEventListener(eventType, () => updateInputWidth(input));
            // Initial update
            setTimeout(() => updateInputWidth(input), 50);
        }
    });

    // Target all textareas for height growth
    document.querySelectorAll('textarea').forEach(textarea => {
        if (!textarea.dataset.autoGrow) {
            textarea.dataset.autoGrow = "true";
            textarea.style.overflowY = 'hidden';
            textarea.addEventListener('input', () => updateTextareaHeight(textarea));
            setTimeout(() => updateTextareaHeight(textarea), 50);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const mainForm = document.querySelector('form');
    const downloadBtn = document.getElementById('downloadBtn');
    const printBtn = document.getElementById('printBtn');

    // Initialize today's date on relevant fields (Always run)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    document.querySelectorAll('.today-date').forEach(input => {
        if (!input.value) {
            input.value = formattedDate;
        }
    });

    // Special NDA selects (Always check)
    const ndaDay = document.getElementById('ndaDateDay');
    const ndaMonth = document.getElementById('ndaDateMonth');
    const ndaYear = document.getElementById('ndaDateYear');

    if (ndaDay && ndaMonth && ndaYear) {
        const day = today.getDate();
        let daySuffix = 'th';
        const d = day % 10;
        const k = day % 100;
        if (d == 1 && k != 11) {
            daySuffix = 'st';
        } else if (d == 2 && k != 12) {
            daySuffix = 'nd';
        } else if (d == 3 && k != 13) {
            daySuffix = 'rd';
        }

        const dayString = String(day).padStart(2, '0') + daySuffix;
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const monthString = monthNames[today.getMonth()];

        Array.from(ndaDay.options).forEach(opt => {
            if (opt.text === dayString) ndaDay.value = opt.value;
        });
        Array.from(ndaMonth.options).forEach(opt => {
            if (opt.text === monthString) ndaMonth.value = opt.value;
        });
        Array.from(ndaYear.options).forEach(opt => {
            if (opt.text === String(yyyy)) ndaYear.value = opt.value;
        });
    }

    // Call setup immediately
    setupAutoResize();

    // Handle ESIC specific date boxes (Always check)
    const esiApptDD = document.getElementById('esiApptDD');
    const esiApptMM = document.getElementById('esiApptMM');
    const esiApptYYYY = document.getElementById('esiApptYYYY');
    if (esiApptDD && esiApptMM && esiApptYYYY) {
        if (!esiApptDD.value) esiApptDD.value = dd;
        if (!esiApptMM.value) esiApptMM.value = mm;
        if (!esiApptYYYY.value) esiApptYYYY.value = yyyy;
    }

    // Robust Print Handler (Always try to attach)
    if (printBtn) {
        printBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.print();
        });
    }

    // Automatically inject "Generate Fillable PDF" button into the action bar
    const actionBar = document.querySelector('.action-bar');
    if (actionBar && !document.getElementById('generateFillablePdfBtn')) {
        const pdfBtn = document.createElement('button');
        pdfBtn.type = 'button';
        pdfBtn.id = 'generateFillablePdfBtn';
        pdfBtn.className = 'btn btn-success ms-2';
        pdfBtn.style.cssText = 'font-weight: 600; display: inline-flex; align-items: center; gap: 6px;';
        pdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Generate Fillable PDF';

        // Insert next to printBtn if available, or append to action-bar
        const existingPrintBtn = document.getElementById('printBtn') || actionBar.querySelector('#printBtn');
        if (existingPrintBtn) {
            existingPrintBtn.parentNode.insertBefore(pdfBtn, existingPrintBtn.nextSibling);
        } else {
            actionBar.appendChild(pdfBtn);
        }

        pdfBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalHTML = pdfBtn.innerHTML;
            pdfBtn.disabled = true;
            pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';

            try {
                // Dynamically load html2canvas and pdf-lib via CDN
                const loadScriptHelper = (url) => {
                    return new Promise((resolve, reject) => {
                        const id = 'script_' + url.replace(/[^a-zA-Z0-9]/g, '');
                        if (document.getElementById(id)) return resolve();
                        const script = document.createElement('script');
                        script.id = id;
                        script.src = url;
                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error('Failed to load ' + url));
                        document.head.appendChild(script);
                    });
                };

                await Promise.all([
                    loadScriptHelper('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
                    loadScriptHelper('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js')
                ]);

                pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Making PDF...';
                await runFillablePdfGeneration();
            } catch (err) {
                console.error(err);
                alert('An error occurred during PDF generation: ' + err.message);
            } finally {
                pdfBtn.disabled = false;
                pdfBtn.innerHTML = originalHTML;
            }
        });
    }

    // Stop early only for form-specific features
    if (!mainForm) return;

    // Save Draft functionality
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            alert('Draft has been saved to local browser storage.');
        });
    }

    // Form submission
    mainForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Simulating submission
        const submitBtn = mainForm.querySelector('button[type="submit"]');
        if (!submitBtn) return;

        const originalText = submitBtn.innerText;
        const formType = mainForm.id === 'pfForm' ? 'PF Nomination' :
            mainForm.id === 'gratuityForm' ? 'Gratuity Nomination' :
                mainForm.id === 'esiForm' ? 'ESI Form-1' :
                    mainForm.id === 'ndaForm' ? 'NDA Form' :
                        mainForm.id === 'undertakingForm' ? 'Undertaking' :
                            mainForm.id === 'taskListForm' ? 'Task List (Sheet B)' :
                                mainForm.id === 'appraisalForm' ? 'Appraisal Form' : 'Form 11';

        submitBtn.disabled = true;
        submitBtn.innerText = 'Submitting...';

        setTimeout(() => {
            alert(formType + ' Form has been successfully submitted to the HR Portal.');
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }, 1500);
    });

    // Universal Signature/Seal Upload Handler
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        // Find the placeholder div (usually the previous sibling)
        const placeholder = input.previousElementSibling;
        if (placeholder && placeholder.classList.contains('border-dashed')) {
            // Setup uploader UI elements if not already done
            if (!placeholder.dataset.initialized) {
                placeholder.dataset.original = placeholder.innerHTML;

                // Create remove button
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'upload-remove-btn no-print';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.title = 'Remove Image';

                // Create preview overlay
                const overlay = document.createElement('div');
                overlay.className = 'upload-preview-overlay no-print';
                overlay.innerHTML = '<i class="fas fa-search-plus"></i>';
                overlay.title = 'View Full Size';

                placeholder.appendChild(removeBtn);
                placeholder.appendChild(overlay);

                // Remove logic
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    input.value = '';
                    placeholder.classList.remove('has-image');
                    placeholder.style.backgroundImage = 'none';
                    placeholder.style.border = '';
                    // Restore original text but keep buttons
                    placeholder.innerHTML = placeholder.dataset.original;
                    placeholder.appendChild(removeBtn);
                    placeholder.appendChild(overlay);
                });

                // Preview logic
                overlay.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const bg = placeholder.style.backgroundImage;
                    if (!bg || bg === 'none') return;

                    const url = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
                    const viewer = document.createElement('div');
                    viewer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
                    viewer.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;box-shadow:0 0 20px rgba(0,0,0,0.5);">`;
                    viewer.onclick = () => viewer.remove();
                    document.body.appendChild(viewer);
                });

                placeholder.dataset.initialized = "true";
            }
        }

        input.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const placeholder = this.previousElementSibling;
            if (!placeholder || !placeholder.classList.contains('border-dashed')) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                placeholder.style.backgroundImage = `url('${event.target.result}')`;
                placeholder.style.backgroundSize = 'contain';
                placeholder.style.backgroundPosition = 'center';
                placeholder.style.backgroundRepeat = 'no-repeat';
                placeholder.style.border = '1px solid #eee';
                placeholder.classList.add('has-image');

                // Keep the buttons, clear the manual text if any
                // We don't want to wipe the remove buttons we just added
                const buttons = placeholder.querySelectorAll('.upload-remove-btn, .upload-preview-overlay');
                placeholder.innerHTML = '';
                buttons.forEach(btn => placeholder.appendChild(btn));
            };
            reader.readAsDataURL(file);
        });
    });

    // Initialize tables that start with multiple rows
    document.querySelectorAll('table').forEach(table => {
        const tbody = table.querySelector('tbody');
        if (tbody && tbody.querySelectorAll('tr').length > 1) {
            table.querySelectorAll('.action-col').forEach(col => col.classList.remove('d-none'));
        }
    });

    // Mutually exclusive checkboxes (allow only one selection per group with same name)
    document.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox' && e.target.name && e.target.checked) {
            const name = e.target.name;
            // Only apply to specific groups or if they have more than 1 in the group
            const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${name}"]`);
            if (checkboxes.length > 1) {
                checkboxes.forEach(cb => {
                    if (cb !== e.target) {
                        cb.checked = false;
                    }
                });
            }
        }
    });
});

function addRow(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const firstRow = tbody.querySelector('tr');
    if (!firstRow) return;

    const newRow = firstRow.cloneNode(true);

    // Clear inputs in new row
    newRow.querySelectorAll('input, select, textarea').forEach(input => {
        if (input.type === 'radio' || input.type === 'checkbox') {
            input.checked = false;
            // Update name to be unique if it ends with a number
            if (input.name) {
                const match = input.name.match(/^(.*?)(\d+)$/);
                if (match) {
                    const baseName = match[1];
                    const nextNum = tbody.querySelectorAll('tr').length + 1;
                    input.name = baseName + nextNum;
                }
            }
        } else {
            input.value = '';
        }
    });

    // Show remove button in new row
    const removeBtn = newRow.querySelector('.remove-row');
    if (removeBtn) {
        removeBtn.classList.remove('d-none');
        // Add data-label back for mobile responsiveness on deletable rows
        const actionTd = removeBtn.closest('td');
        if (actionTd) {
            actionTd.setAttribute('data-label', 'Delete');
            actionTd.classList.remove('d-none');
        }
    }

    tbody.appendChild(newRow);

    // Setup auto-resize for new elements
    if (typeof setupAutoResize === 'function') {
        setupAutoResize();
    }

    // Toggle action column visibility
    const rows = tbody.querySelectorAll('tr');
    if (rows.length > 1) {
        table.querySelectorAll('.action-col').forEach(el => el.classList.remove('d-none'));
    }

    updateSrNumbers(tableId);
}

function removeRow(btn, tableId) {
    const row = btn.closest('tr');
    if (row) {
        const tbody = row.parentNode;
        tbody.removeChild(row);

        const table = document.getElementById(tableId);
        const rows = tbody.querySelectorAll('tr');
        if (rows.length === 1) {
            // Hide the entire action column including the head
            table.querySelectorAll('.action-col').forEach(el => el.classList.add('d-none'));
        }

        updateSrNumbers(tableId);
    }
}

function updateSrNumbers(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const srCells = table.querySelectorAll('.sr-num');
    srCells.forEach((cell, index) => {
        cell.textContent = index + 1;
    });
}

// High-Fidelity Client-Side Fillable PDF Generation Engine
async function runFillablePdfGeneration() {
    // 1. Target the form or document body
    const container = document.querySelector('form') || document.body;

    // Temporarily hide non-printable UI elements (like headers, action bars, navigation, buttons)
    const elementsToHide = document.querySelectorAll('.no-print, .action-bar, nav, .navbar, #generateFillablePdfBtn, .btn-link, button[onclick="addNewAchievement()"], button[onclick="addNewPlannedTask()"]');
    const hiddenOriginalStyles = [];

    elementsToHide.forEach(el => {
        hiddenOriginalStyles.push({ el, display: el.style.display });
        el.style.setProperty('display', 'none', 'important');
    });

    // Swap all inputs/textareas with high-fidelity temporary divs to prevent vertical text-clipping/scroll issues in html2canvas
    const textareasAndInputs = container.querySelectorAll('input, textarea, select');
    const swappedElements = [];

    textareasAndInputs.forEach(el => {
        if (el.type === 'file' || el.type === 'submit' || el.type === 'button' || el.type === 'checkbox') return;
        if (el.offsetWidth === 0 || el.offsetHeight === 0) return;

        const computedStyle = window.getComputedStyle(el);
        const tempEl = document.createElement('div');

        // Match exact classes and styles
        tempEl.className = el.className;

        tempEl.style.width = computedStyle.width;
        tempEl.style.height = computedStyle.height;
        tempEl.style.fontFamily = computedStyle.fontFamily;
        tempEl.style.fontSize = computedStyle.fontSize;
        tempEl.style.fontWeight = computedStyle.fontWeight;
        tempEl.style.letterSpacing = computedStyle.letterSpacing;
        tempEl.style.lineHeight = computedStyle.lineHeight;
        tempEl.style.color = computedStyle.color;
        tempEl.style.textAlign = computedStyle.textAlign;
        tempEl.style.padding = computedStyle.padding;
        tempEl.style.margin = computedStyle.margin;
        tempEl.style.border = computedStyle.border;
        tempEl.style.borderBottom = computedStyle.borderBottom;
        tempEl.style.backgroundColor = computedStyle.backgroundColor;
        tempEl.style.boxSizing = computedStyle.boxSizing;
        tempEl.style.display = computedStyle.display;
        tempEl.style.alignItems = computedStyle.alignItems;
        tempEl.style.justifyContent = computedStyle.justifyContent;
        tempEl.style.flexDirection = computedStyle.flexDirection;
        tempEl.style.wordBreak = 'break-word';
        tempEl.style.whiteSpace = 'pre-wrap';
        tempEl.style.textTransform = computedStyle.textTransform;

        // Assign value
        if (el.tagName === 'SELECT') {
            tempEl.textContent = el.options[el.selectedIndex]?.text || '';
        } else {
            tempEl.textContent = el.value || '';
        }

        const originalDisplay = el.style.display;
        el.style.setProperty('display', 'none', 'important');
        el.parentNode.insertBefore(tempEl, el);

        swappedElements.push({ el, tempEl, originalDisplay });
    });

    try {
        // Render the form container to a high-res structural canvas
        const canvas = await html2canvas(container, {
            scale: 2, // Double DPI for professional vector-like rendering
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            allowTaint: true
        });

        // Immediately restore original visibility of UI elements
        hiddenOriginalStyles.forEach(({ el, display }) => {
            el.style.display = display;
        });

        // Restore inputs and textareas
        swappedElements.forEach(({ el, tempEl, originalDisplay }) => {
            if (tempEl.parentNode) {
                tempEl.parentNode.removeChild(tempEl);
            }
            el.style.display = originalDisplay;
        });

        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();

        // Standard A4 dimensions in PDF/Postscript points: 595.28 x 841.89 pt
        const pdfPageW = 595.28;
        const pdfPageH = 841.89;
        const margin = 24; // Clean space/border of 24 points (1/3 inch) on all sides

        const printableW = pdfPageW - 2 * margin;
        const printableH = pdfPageH - 2 * margin;
        const printableRatio = printableW / printableH;

        const canvasW = canvas.width;
        const canvasH = canvas.height;

        // Height of each page slice in canvas coordinates (pixels) to yield exact printable area aspect ratio:
        const canvasSliceH = canvasW / printableRatio;

        // Scaling factor converting canvas coordinates to printable standard space
        const scaleFactor = printableW / canvasW;

        const totalPages = Math.ceil(canvasH / canvasSliceH);
        const pdfPageRefs = [];

        // Slice canvas vertically into individual A4 pages and embed them
        for (let i = 0; i < totalPages; i++) {
            const startY = i * canvasSliceH;
            const cropH = Math.min(canvasSliceH, canvasH - startY);

            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvasW;
            sliceCanvas.height = canvasSliceH;

            const ctx = sliceCanvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasW, canvasSliceH); // fill base with solid white

            // Draw cropped segment of original form
            ctx.drawImage(
                canvas,
                0, startY, canvasW, cropH,
                0, 0, canvasW, cropH
            );

            const imgData = sliceCanvas.toDataURL('image/jpeg', 0.90);
            const embeddedJpg = await pdfDoc.embedJpg(imgData);

            const page = pdfDoc.addPage([pdfPageW, pdfPageH]);

            // Draw background image leaving an elegant white border space on all sides
            page.drawImage(embeddedJpg, {
                x: margin,
                y: margin,
                width: printableW,
                height: printableH
            });

            pdfPageRefs.push(page);
        }

        // Obtain AcroForm builder handle
        const form = pdfDoc.getForm();
        const containerRect = container.getBoundingClientRect();

        // Locate all fillable elements
        const formControls = container.querySelectorAll('input, textarea, select');

        formControls.forEach((el, index) => {
            // Ignore non-interactive utility controls
            if (el.type === 'file' || el.type === 'submit' || el.type === 'button') return;
            // Ignore items explicitly set to display none in DOM
            if (el.offsetWidth === 0 || el.offsetHeight === 0) return;

            const rect = el.getBoundingClientRect();

            // Relativize element coordinates inside the form container (ignoring scrolls)
            const relX = rect.left - containerRect.left;
            const relY = rect.top - containerRect.top;
            const relW = rect.width;
            const relH = rect.height;

            // Convert relative client pixels to actual high-DPI canvas coordinates
            const clientToCanvasX = canvasW / containerRect.width;
            const clientToCanvasY = canvasH / containerRect.height;

            const canvasX = relX * clientToCanvasX;
            const canvasY = relY * clientToCanvasY;
            const canvasW_pt = relW * clientToCanvasX;
            const canvasH_pt = relH * clientToCanvasY;

            // Find which page slice contains this control
            const pageIdx = Math.floor(canvasY / canvasSliceH);
            if (pageIdx < 0 || pageIdx >= totalPages) return;

            const page = pdfPageRefs[pageIdx];

            // Y-offset from the top of the specific page slice on canvas
            const relativeSliceY = canvasY % canvasSliceH;

            // Transform canvas dimensions/positions to PDF standard coordinate space with margins accounted for
            const pdfX = margin + canvasX * scaleFactor;
            const pdfW = canvasW_pt * scaleFactor;
            const pdfH = canvasH_pt * scaleFactor;

            // Bottom-up PDF page space: y=0 is bottom, aligned with the top margin of the page
            const pdfY = (pdfPageH - margin) - (relativeSliceY + canvasH_pt) * scaleFactor;

            // Discard microscopic artifacts
            if (pdfW < 5 || pdfH < 5) return;

            // Construct a pristine non-conflicting field key
            const baseKey = el.name || el.id || 'field';
            const uniqueFieldKey = `${baseKey.replace(/[^a-zA-Z0-9_]/g, '_')}_p${pageIdx}_i${index}`;

            try {
                if (el.type === 'checkbox') {
                    const cbField = form.createCheckBox(uniqueFieldKey);
                    if (el.checked) {
                        cbField.check();
                    }
                    cbField.addToPage(page, {
                        x: pdfX,
                        y: pdfY,
                        width: pdfW,
                        height: pdfH
                    });
                } else if (el.tagName === 'SELECT') {
                    const listOptions = Array.from(el.options)
                        .map(opt => (opt.text || opt.value || '').trim())
                        .filter(txt => txt.length > 0);

                    if (listOptions.length > 0) {
                        const selectField = form.createDropdown(uniqueFieldKey);
                        selectField.setOptions(listOptions);

                        const curText = el.options[el.selectedIndex]?.text;
                        if (curText) {
                            selectField.select(curText);
                        }
                        selectField.addToPage(page, {
                            x: pdfX,
                            y: pdfY,
                            width: pdfW,
                            height: pdfH
                        });
                    }
                } else {
                    // text, email, number, textarea, date etc.
                    const textField = form.createTextField(uniqueFieldKey);
                    textField.setText(el.value || '');

                    if (el.tagName === 'TEXTAREA' || (pdfW > 150 && pdfH > 35)) {
                        textField.enableMultiline();
                    }

                    // Style Font/Sizings elegantly
                    const fitFontSize = Math.max(7, Math.min(10, pdfH * 0.55));
                    textField.setFontSize(fitFontSize);

                    textField.addToPage(page, {
                        x: pdfX,
                        y: pdfY,
                        width: pdfW,
                        height: pdfH
                    });
                }
            } catch (fieldError) {
                console.error(`Field generation failure for ${uniqueFieldKey}:`, fieldError);
            }
        });

        // Save binary array and download via Blob API
        const finalPdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(pdfBlob);

        const anchor = document.createElement('a');
        anchor.href = downloadUrl;

        let invoiceNo = 'GL_236';
        const invoiceInputEl = document.getElementById('invoiceNoInput');
        if (invoiceInputEl && invoiceInputEl.value) {
            invoiceNo = invoiceInputEl.value.trim().replace(/[\/\\?%*:|"<>\s]+/g, '_');
        }
        anchor.download = `SaleBill_${invoiceNo}.pdf`;

        document.body.appendChild(anchor);
        anchor.click();

        document.body.removeChild(anchor);
        URL.revokeObjectURL(downloadUrl);

    } catch (genError) {
        // Ensure UI elements are always restored if error happens
        hiddenOriginalStyles.forEach(({ el, display }) => {
            el.style.display = display;
        });
        swappedElements.forEach(({ el, tempEl, originalDisplay }) => {
            if (tempEl.parentNode) {
                tempEl.parentNode.removeChild(tempEl);
            }
            el.style.display = originalDisplay;
        });
        throw genError;
    }
}
