document.addEventListener('DOMContentLoaded', () => {
    let uploadedFiles = [];
    const REQUIRED_BANDS = 3;
    const VALID_EXTENSIONS = ['.tif', '.tiff'];

    const uploadForm = document.getElementById('uploadForm');
    const imageInput = document.getElementById('imageInput');
    const bandPreviews = document.getElementById('bandPreviews');
    const createCompositeBtn = document.getElementById('createComposite');
    const bandAssignmentCard = document.getElementById('bandAssignmentCard');
    const redBandSelect = document.getElementById('redBand');
    const greenBandSelect = document.getElementById('greenBand');
    const blueBandSelect = document.getElementById('blueBand');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const files = imageInput.files;
        
        if (!files || files.length !== REQUIRED_BANDS) {
            alert(`Please select exactly ${REQUIRED_BANDS} band files`);
            return;
        }

        // Validate file extensions
        const invalidFiles = Array.from(files).filter(file => 
            !VALID_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
        );

        if (invalidFiles.length > 0) {
            alert(`Invalid file format. Please upload only TIF/TIFF files.\nInvalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
            return;
        }

        const uploadPromises = Array.from(files).map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                if (response.ok) {
                    return {
                        ...data,
                        originalName: file.name
                    };
                } else {
                    throw new Error(data.error || 'Upload failed');
                }
            } catch (error) {
                console.error('Error uploading file:', file.name, error);
                throw error;
            }
        });

        try {
            const results = await Promise.all(uploadPromises);
            uploadedFiles = results;
            
            // Clear previous previews
            bandPreviews.innerHTML = '';
            
            // Load previews for all files
            results.forEach((result, index) => {
                loadBandPreview(result, index);
            });

            // Update band selection dropdowns
            updateBandSelects(results);

            // Show band assignment card
            bandAssignmentCard.style.display = 'block';
        } catch (error) {
            alert('Failed to upload some files. Please check the console for details.');
        }
    });

    function updateBandSelects(files) {
        const selects = [redBandSelect, greenBandSelect, blueBandSelect];
        
        // Clear all selects
        selects.forEach(select => {
            select.innerHTML = '';
        });

        // Add options for each file
        files.forEach((file, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = file.originalName;
            
            // Add this option to all selects
            selects.forEach(select => {
                select.appendChild(option.cloneNode(true));
            });
        });

        // Set default values (first file to R, second to G, third to B)
        selects.forEach((select, index) => {
            select.value = index;
        });
    }

    function loadBandPreview(fileData, index) {
        const col = document.createElement('div');
        col.className = 'col-md-4 band-preview';
        
        const card = document.createElement('div');
        card.className = 'card h-100';
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body text-center';
        
        const title = document.createElement('h6');
        title.className = 'card-title';
        title.textContent = fileData.originalName;
        
        const img = document.createElement('img');
        img.src = `/bands/${fileData.file_id}/1`; // Single band images
        img.alt = `Band ${index + 1}`;
        img.className = 'img-fluid mb-2';
        
        cardBody.appendChild(title);
        cardBody.appendChild(img);
        card.appendChild(cardBody);
        col.appendChild(card);
        bandPreviews.appendChild(col);
    }

    createCompositeBtn.addEventListener('click', async () => {
        if (uploadedFiles.length !== REQUIRED_BANDS) {
            alert('Please upload all three band files first');
            return;
        }

        const redIndex = parseInt(redBandSelect.value);
        const greenIndex = parseInt(greenBandSelect.value);
        const blueIndex = parseInt(blueBandSelect.value);

        try {
            // First get the preview
            const previewResponse = await fetch('/composite/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    red_file_id: uploadedFiles[redIndex].file_id,
                    green_file_id: uploadedFiles[greenIndex].file_id,
                    blue_file_id: uploadedFiles[blueIndex].file_id
                })
            });

            if (!previewResponse.ok) {
                throw new Error('Failed to create preview');
            }

            const previewBlob = await previewResponse.blob();
            const previewUrl = URL.createObjectURL(previewBlob);

            // Update preview
            const previewContainer = document.querySelector('.composite-preview-container');
            previewContainer.innerHTML = '';
            
            const previewDiv = document.createElement('div');
            previewDiv.className = 'text-center';
            
            const img = document.createElement('img');
            img.src = previewUrl;
            img.className = 'img-fluid mb-3';
            img.alt = 'RGB Composite Preview';

            // Now create and download the full TIFF
            const response = await fetch('/composite/custom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    red_file_id: uploadedFiles[redIndex].file_id,
                    green_file_id: uploadedFiles[greenIndex].file_id,
                    blue_file_id: uploadedFiles[blueIndex].file_id
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create TIFF');
            }

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'btn btn-primary';
            downloadBtn.textContent = 'Download Full Resolution TIFF';
            downloadBtn.onclick = async () => {
                const tiffBlob = await response.blob();
                const tiffUrl = URL.createObjectURL(tiffBlob);
                const link = document.createElement('a');
                link.href = tiffUrl;
                link.download = 'rgb_composite.tiff';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(tiffUrl);
            };
            
            previewDiv.appendChild(img);
            previewDiv.appendChild(downloadBtn);
            previewContainer.appendChild(previewDiv);

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to create composite. Please try again.');
        }
    });
});
