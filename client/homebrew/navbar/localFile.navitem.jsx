import React from 'react';
import sanitizeFilename from 'sanitize-filename';
import Nav from './nav.jsx';

//Pulls a usable title out of the first non-empty line of the brew's text,
//stripping markdown heading/HB-markup syntax so it reads like a plain name.
const firstLineTitle = (text)=>{
	const firstLine = (text || '').split('\n').find((line)=>line.trim().length);
	if(!firstLine) return '';

	return firstLine
		.trim()
		.replace(/^#+\s*/, '')       //Markdown heading markers
		.replace(/[{}]/g, '')        //HB mustache/style-tag syntax
		.replace(/^\\page(?:break)?$/, '')
		.trim();
};

//Download the current draft's raw source as a local .txt file, no save/share required.
const exportDraft = (brew)=>{
	const name = brew.title?.trim() || firstLineTitle(brew.text) || 'Untitled-Brew';

	let fileName = sanitizeFilename(`HB - ${name}`).replaceAll(' ', '');
	if(!fileName || !fileName.length) fileName = 'HB-Untitled-Brew';

	const blob = new Blob([brew.text], { type: 'text/plain' });
	const url  = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href     = url;
	link.download = `${fileName}.txt`;
	link.click();
	URL.revokeObjectURL(url);
};

export default ({ brew, setBrew })=>{
	//Load a local text file's contents into the currently open draft, overwriting its text.
	const handleImportFile = (e)=>{
		const file = e.target.files[0];
		e.target.value = null; //Allow re-selecting the same file later
		if(!file) return;

		if(!confirm('This will overwrite the current draft\'s text with the contents of the selected file. Continue?')) return;

		const reader = new FileReader();
		reader.onload = (e)=>{
			setBrew((prevBrew)=>({ ...prevBrew, text: e.target.result }));
		};
		reader.readAsText(file);
	};

	return (
		<Nav.dropdown>
			<Nav.item icon='fas fa-file-export'>
				local file
			</Nav.item>
			<Nav.item color='blue' icon='fas fa-download' onClick={()=>exportDraft(brew)}>
				export .txt
			</Nav.item>
			<Nav.item
				color='blue'
				icon='fas fa-upload'
				onClick={()=>{ document.getElementById('importDraftFile').click(); }}>
				<input id='importDraftFile' type='file' accept='.txt,.md' onChange={handleImportFile} style={{ display: 'none' }} />
				import file
			</Nav.item>
		</Nav.dropdown>
	);
};
