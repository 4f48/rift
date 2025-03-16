import JSZip from 'jszip';

export async function processFiles(files: FileList): Promise<File> {
	if (files.length == 1) return files[0];

	return createZip(files);
}

async function createZip(files: FileList): Promise<File> {
	const zip = new JSZip();
	for (const file of files) {
		zip.file(file.name, file);
	}

	const blob = await zip.generateAsync({
		type: 'blob',
		compression: 'DEFLATE',
		compressionOptions: {
			level: 6
		},
		streamFiles: true
	});
	return new File([blob], 'files.zip', {
		type: blob.type,
		lastModified: Date.now()
	});
}
