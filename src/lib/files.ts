import JSZip from 'jszip';
import { toast } from 'svelte-sonner';

/**
 * Appends some new files to a list of files.
 * @param newFiles files to be added to the list of files
 * @param files files list to add the new files to
 * @returns number of files added
 */
function appendFiles(newFiles: FileList, files: File[]): number {
	let i = 0;
	while (i < newFiles.length) {
		const file: File | null = newFiles.item(i);
		if (!file) throw Error('out of bounds');
		files.push(file);
		i++;
	}
	return i;
}

/**
 * Adds files from the input element to a files list in response to a change event.
 * @param event "onchange" event
 * @param fileAdder input element
 * @param files files list to add the new files to
 * @returns the number of files added
 */
export function addFiles(
	event: Event,
	fileAdder: HTMLInputElement | undefined,
	files: File[]
): number {
	event.preventDefault();
	if (!fileAdder) throw Error('fileAdder cannot be undefined');
	const newFiles: FileList | null = fileAdder.files;
	if (!newFiles) return 0;

	return appendFiles(newFiles, files);
}

/**
 * Adds files from a drag & drop event to a files list.
 * @param event "ondrop" event
 * @param files files list to add the new files to
 * @returns number of files added
 */
export function addDroppedFiles(event: DragEvent, files: File[]): number {
	const dataTransfer: DataTransfer | null = event.dataTransfer;
	if (!dataTransfer) throw Error('dataTransfer cannot be null');
	const newFiles: FileList = dataTransfer.files;

	return appendFiles(newFiles, files);
}

/**
 * Removes a specified file from a files list by its index.
 * @param files files list to remove the file from
 * @param index index of the file to be removed
 */
export function removeFile(files: File[], index: number): void {
	files.splice(index, 1);
}

/**
 * Resets the values of an input element.
 * @param inputRef input element to reset
 */
export function resetInput(inputRef: HTMLInputElement): void {
	setTimeout(() => (inputRef.value = ''), 0);
}

/**
 * Converts the inputted files to array buffers. If multiple files are present, a ZIP archive is created.
 * @param files files to process
 * @returns a single file in an array buffer, which may be a zip archive if multiple files were present
 */
export async function processFiles(files: File[]): Promise<File> {
	if (files.length == 1) return files[0];

	const zip = new JSZip();
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		zip.file(file.name, file);
	}
	const blob = await zip.generateAsync({
		type: 'blob',
	});
	return new File([blob], 'files.zip', {
		type: 'zip',
		lastModified: Date.now(),
	});
}

export function saveFile(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	URL.revokeObjectURL(url);
	document.body.removeChild(a);
	toast.success('Transfer complete.', {
		description: `Successfully saved ${fileName}.`,
	});
}
