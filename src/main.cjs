
// I don't want to touch the originally scaffolded "if (require('electron-squirrel-startup'))" at the moment.
// thus this file is staying common js.

// TODO: If main.cjs throws an error will the languageServer process be killed (if previously was started)?

const { app, BrowserWindow, dialog, ipcMain, clipboard } = require('electron');
const path = require('node:path');
const fs = require('fs');
const AppDatabase = require('./Database/database').default;

//// Find-All for "EDI_debug_optimization" to find all the commented out logic that was related to this.
//// I used `$env:ELECTRON_ENABLE_LOGGING=1; npm run start` to start the app, I have not confirmed whether this was necessary or not yet.
// 
// app.commandLine.appendSwitch('js-flags', '--allow-natives-syntax');
// app.commandLine.appendSwitch('enable-logging');

if (!app.isPackaged) {
	app.setPath('userData', path.join(app.getPath('appData'), 'my-app-Debug'));
}

let database;

/** openedDirectory | openedWorkspace; TODO: consider making single object with bool 'isWorkspace' */
let openedDirectory = null;
/** openedDirectory | openedWorkspace; TODO: consider making single object with bool 'isWorkspace'  */
let openedWorkspace = null;
let workspaceDirectories = null;

// I feel anxious about this because this isn't great no matter what at the moment.
// And I worry "should I include 'build' should I include 'out'"...
// 
// ultimately my goal is to get any amount of find all to begin working again.
// currently there is 0 find all working.
// 
// The previous version contained 'build'
// 
// The goal is NOT to optimize ignored directories.
// The true answer for this is likely to just read .gitignore
// so sitting here worried about each one of these is just pointless.
//
const FIND_ALL_IGNORED_DIRS = new Set(['.vs', '.vscode', '.git', 'node_modules', 'bin', 'obj', 'out', 'build', 'preprocessor']);
let _findAllStack = [];
/**
 * @type {Buffer}
 */
let _findAllBuffer = null;
const matches_capacity_initial = 256;
let _findAllMatches = {
	matches_capacity: matches_capacity_initial,
	matches_count: 0,
	matches: new Uint32Array(matches_capacity_initial),
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	app.quit();
}

/**
 * @param {*} absolutePath 
 * @returns {boolean} to indicate whether the invoker is permitted to continue execution with the given absolutePath
 */
function isValidAbsolutePath(absolutePath) {
    // The provided absolute file path is validated.
    // If the absolute file path is NOT recognized, then an empty enumeration is returned.
    if (absolutePath !== openedDirectory && !database.contains(absolutePath)) return false;

	return true;
}

const createWindow = () => {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			contextIsolation: true, // this might already be the default value
			preload: path.join(__dirname, 'preload.js'),
		},
		autoHideMenuBar: true,
	});

	// and load the index.html of the app.
	mainWindow.loadFile(path.join(__dirname, 'index.html'));

	mainWindow.isMenuBarVisible(false);

	// Handle the request from the renderer process
	ipcMain.handle('editor-save-file', editorSaveFile);
	ipcMain.handle('editor-save-file-as', editorSaveFileAs);


	ipcMain.on('editor-read-all-text-byteArray', port_editorReadAllText_byteArray);
	//ipcMain.handle('editor-read-all-text-byteArray', editorReadAllText_byteArray);


	ipcMain.handle('editor-set-clipboard', editorSetClipboard);
	ipcMain.handle('choose-directory', chooseDirectory);
	ipcMain.handle('choose-workspace', chooseWorkspace);
	ipcMain.handle('get-filesystem-entries', getFilesystemEntries);
	ipcMain.handle('get-filesystem-entry-by-id', getFilesystemEntryById);
	ipcMain.handle('get-filesystem-entry-by-id-array', getFilesystemEntryById_ARRAY);
	// LSP specification might have something defined for this I'll check later I just don't feel like it right now I'm pushing to force myself to get this typed out rather than procrastinate.
	ipcMain.handle('set-clipboard', setClipboard);
	ipcMain.handle('read-clipboard', readClipboard);
	ipcMain.handle('find-all', findAll);
	ipcMain.handle('new-file', newFile);
	ipcMain.handle('delete-file', deleteFile);
	ipcMain.handle('rename-file', renameFile);
	ipcMain.handle('paste-clipboard-absolute-path-to-directory', pasteClipboardAbsolutePathToDirectory);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	database = new AppDatabase();
	createWindow();

	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

/**
 * TODO: Store the path more optimally to avoid doing this each time?
 * TODO: capital 'c' or lowercase, encoded ':' and etc... or not?
 */
function formatAbsolutePath(absolutePath) {
	return absolutePath;
	//return 'file:///' + absolutePath.replaceAll('\\', '/');
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

/**
 * TODO: repeated duplications of the same extremely large selection might benefit from temporary caching of this functions result.
 * 
 * TODO: SPECULATION: If passing the byte array requires a copy to be made then you perhaps might as well make the string in the renderer process? I'm trying to consider...
 * ...whether gc would incur reduce renderer process if this is done in the main process.
 * 
 * textonly is in reference to conversion of the raw storage of the text editor such that all line feeds get returned as as EDI_lineEndString rather than the internal representation of '\n'.
 * 
 * @returns {string}
 */
function MAIN_decode_experimental_textonly(bytes, start, length, EDI_lineEndString, EDI_fileStartsWithBom) {
	let byteOrderMarkString = '';
	if (EDI_fileStartsWithBom) {
		byteOrderMarkString = "\uFEFF";
	}
	if (length <= 0) {
		return byteOrderMarkString;
	}

	let end = start + length;

	let EDI_decoder = new TextDecoder();
	let decodedText = EDI_decoder.decode(bytes.subarray(start, end));
	if (!EDI_lineEndString) {
		EDI_lineEndString = '\n';
	}
	if (EDI_lineEndString !== '\n') {
		decodedText = decodedText.replaceAll('\n', EDI_lineEndString);
	}
	
	return byteOrderMarkString + decodedText;
}

/**
 * Extracts more data per entry { basename, absolutePath, isDirectory, id }
 * and applies a common sorting prior to returning results.
 * */
function wrap_readdirSync_getChildList(parentAbsolutePath) {
	let childList = fs.readdirSync(parentAbsolutePath, { withFileTypes: true });
	for (var i = 0; i < childList.length; i++) {
		let filename = childList[i].name;
		let isDirectory = childList[i].isDirectory();
		let childAbsolutePath = path.join(parentAbsolutePath, filename);
		let id = database.addAbsolutePath(childAbsolutePath, filename);
		childList[i] = {
			basename: filename,
			absolutePath: childAbsolutePath,
			isDirectory: isDirectory,
			id: id
		};
	}

	childList.sort((a, b) => {
		if (a.isDirectory && !b.isDirectory) {
			return -1;
		}

		if (!a.isDirectory && b.isDirectory) {
			return 1;
		}

		return a.basename.localeCompare(b.basename);
	});

	return childList;
}

/**
 * Applies a common sorting prior to finding the indexOf
 * 
 * (does NOT internally extract any extra data than what is used for determining the indexOf)
 * 
 * TODO: This could still be faster. You shouldn't need to have an initial loop over the array to rewrite each index as { basename, isDirectory } to do this.
 * TODO: As well I believe checking the filename alone (not checking the childIsDirectory) is sufficient.
 */
function wrap_readdirSync_indexOf(parentAbsolutePath, childFilename, childIsDirectory) {
	let childList = fs.readdirSync(parentAbsolutePath, { withFileTypes: true });
	for (var i = 0; i < childList.length; i++) {
		let filename = childList[i].name;
		let isDirectory = childList[i].isDirectory();
		childList[i] = {
			basename: filename,
			isDirectory: isDirectory,
		};
	}

	childList.sort((a, b) => {
		if (a.isDirectory && !b.isDirectory) {
			return -1;
		}

		if (!a.isDirectory && b.isDirectory) {
			return 1;
		}

		return a.basename.localeCompare(b.basename);
	});

	for (let i = 0; i < childList.length; i++) {
		if (childList[i].basename === childFilename && childList[i].isDirectory === childIsDirectory) {
			return i;
		}
	}

	return -1;
}

async function chooseDirectory (event) {
	const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
	if (result.canceled) {
		return { basename: '', openedDirectory: '', canceled: result.canceled };
	}

	openedDirectory = result.filePaths[0];
	openedWorkspace = null;
	workspaceDirectories = null;

	let filename = path.basename(openedDirectory);
	let id = database.addAbsolutePath(openedDirectory, filename);

	return { basename: filename, openedDirectory: openedDirectory, id: id, canceled: result.canceled };
}

async function chooseWorkspace(event) {
	const result = await dialog.showOpenDialog({ properties: ['openFile'] });
	if (result.canceled) {
		return {
			workspaceFileAbsolutePath: null,
			workspaceFileNameWithoutExtension: null,
			directories: [],
			canceled: result.canceled };
	}

	openedDirectory = null;
	openedWorkspace = result.filePaths[0];
	workspaceDirectories = null;

	let filename = path.basename(openedWorkspace);
	let id = database.addAbsolutePath(openedWorkspace, filename);

	let fileContent = fs.readFileSync(openedWorkspace, 'utf8');
	let jsonObject = JSON.parse(fileContent);

	if (!jsonObject.folders) {
		throw new Error('if (!jsonObject.folders)');
	}

	let parentDirectoryAbsolutePath = path.dirname(openedWorkspace);

	let directories = [];
	  
	for (let i = 0; i < jsonObject.folders.length; i++) {
		let folderEntry = jsonObject.folders[i];
		let absolutePath = path.join(parentDirectoryAbsolutePath, folderEntry.path);
		let filename = path.basename(absolutePath);
		let id = database.addAbsolutePath(absolutePath, filename);
		directories.push({
			basename: filename,
			absolutePath: absolutePath,
			id: id,
		});
	}

	workspaceDirectories = directories;

	return {
		workspaceFileAbsolutePath: openedWorkspace,
		workspaceFileNameWithoutExtension: path.parse(openedWorkspace).name,
		directories: directories,
		canceled: result.canceled
	};
}

async function getFilesystemEntries(event, argument, argumentIsId) {

	let parentAbsolutePath;

	if (argumentIsId) {
		let entry = database.getBy_id(argument);
		if (!entry) return;

		parentAbsolutePath = entry.value;
	}
	else {
		parentAbsolutePath = argument;
		if (!isValidAbsolutePath(parentAbsolutePath)) return;
	}

	try {
		return wrap_readdirSync_getChildList(parentAbsolutePath);
	}
	catch (err) {
		console.error("Error reading directory:", err);
		return [];
	}
}

async function getFilesystemEntryById(event, id) {
	try {
		let entry = database.getBy_id(id);
		if (!entry) {
			return null;
		}
		else {
			return {
				basename: entry.displayName,
				absolutePath: entry.value,
				isDirectory: fs.statSync(entry.value)?.isDirectory() ?? false
			};
		}
	}
	catch (err) {
		console.error("Error during get-filesystem-entry-by-id:", err);
		return [];
	}
}

async function getFilesystemEntryById_ARRAY(event, arrayKeys) {
	try {
		const KEY_BITS = 12;
        const KEY_MASK = (1 << KEY_BITS) - 1; // Binary: 00000000000000000000111111111111 (0xFFF)

		let arrayEntries = new Array(arrayKeys.length);
		for (let i = 0; i < arrayKeys.length; i++) {
			let packedInteger = arrayKeys[i];
			const key = packedInteger & KEY_MASK;
			let entry = database.getBy_id(key);
			if (!entry) {
				//arrayEntries[i] = null;
				arrayEntries[i] =  {
					basename: 'basenameUndefined',
					absolutePath: 'absolutePathUndefined',
					// TODO: return 'null' not 'true'. And then the UI should interpret this as "whatever you currently have just keep it that way cause nobody knows what the file even is anymore"...
					// ...because presumably a render happened between the time that the FS deleted the file, but before the UI removed it from the node list... this is only speculation but it probably is what is happening.
					// thus the next render should correctly remove the node from the UI anyways.					
					isDirectory: true//fs.statSync(entry.value)?.isDirectory() ?? false
				};
			}
			else {

				let fsStatSyncResult;
				
				try {
					fsStatSyncResult = fs.statSync(entry.value);
				}
				catch (err) {
					fsStatSyncResult = null;
				}

				// Oddly if the node is expanded this works entirely but if collapsed the node visually never gets removed.

				arrayEntries[i] =  {
					basename: entry.displayName,
					absolutePath: entry.value,
					// TODO: return 'null' not 'true'. And then the UI should interpret this as "whatever you currently have just keep it that way cause nobody knows what the file even is anymore"...
					// ...because presumably a render happened between the time that the FS deleted the file, but before the UI removed it from the node list... this is only speculation but it probably is what is happening.
					// thus the next render should correctly remove the node from the UI anyways.
					isDirectory: fsStatSyncResult?.isDirectory() ?? true
				};
			}
		}
		return arrayEntries;
	}
	catch (err) {
		console.error("Error during get-filesystem-entry-by-id:", err);
		return [];
	}
}

function countNewlines(sourceString) {
    let count = 0;
    let pos = sourceString.indexOf('\n');
    while (pos !== -1) {
        count++;
        pos = sourceString.indexOf('\n', pos + 1);
    }
    return count;
}

async function port_editorReadAllText_byteArray(event, message) {
	// Grab the port shipped from the Renderer safely
	const port = event.ports[0];

	if (!port) {
		console.error("No valid communication port received from Renderer!");
		return;
	}

	try {
		const { absolutePath } = message;

		// Process the file using your C#-style byte normalization logic
		const result = await editorReadAllText_byteArray(null, absolutePath);

		if (!result || !result.paddedUint8Array) {
			port.postMessage(result);
			port.close();
			return;
		}

		// Direct object serialization across MessagePortMain is fully optimized in modern Electron.
		// This ships your padded Uint8Array directly over the IPC port without V8 main-thread locking.
		port.postMessage(result);
	} catch (err) {
		console.error("Failed to post message over channel port:", err);
	} finally {
		port.close();
	}
}

function editorReadAllText_byteArray(event, absolutePath) {
  if (!isValidAbsolutePath(absolutePath)) return createEmptyResponse();

  let fd = null;
  try {
    const basename = path.basename(absolutePath);
    const extension = path.extname(absolutePath);
    const paddingLength = 1024;

    // 1. Get file stats and open a file descriptor
    const stat = fs.statSync(absolutePath);
    const fileSize = stat.size;
    fd = fs.openSync(absolutePath, 'r');

    // 2. Allocate ONE single buffer with the exact tail padding built in
    const totalCapacity = fileSize + paddingLength;
    const rawBuffer = Buffer.allocUnsafe(totalCapacity);

    // 3. Read the file bytes directly into the beginning of our padded buffer
    fs.readSync(fd, rawBuffer, 0, fileSize, 0);

    let hadBomMark = false;
    let dataStartIndex = 0;

    const CR = 13; // '\r'
    const LF = 10; // '\n'
    let lineEndingKind = 2; 

    // 4. Detect the BOM
    if (fileSize >= 3 &&
        rawBuffer[0] === 0xEF &&
        rawBuffer[1] === 0xBB &&
        rawBuffer[2] === 0xBF) {
      hadBomMark = true;
      dataStartIndex = 3;
    }

    // 5. Scan ahead to judge the first line break
    let firstLineBreakIndex = -1;
    for (let i = dataStartIndex; i < fileSize; i++) {
      if (rawBuffer[i] === CR || rawBuffer[i] === LF) {
        firstLineBreakIndex = i;
        break;
      }
    }

    if (firstLineBreakIndex !== -1) {
      if (rawBuffer[firstLineBreakIndex] === CR &&
          firstLineBreakIndex + 1 < fileSize &&
          rawBuffer[firstLineBreakIndex + 1] === LF) {
        lineEndingKind = 3;
      } else if (rawBuffer[firstLineBreakIndex] === LF) {
        lineEndingKind = 2;
      } else if (rawBuffer[firstLineBreakIndex] === CR) {
        lineEndingKind = 1;
      }
    }

    // 6. In-place normalization loop
    let targetIndex = 0;
    let lineEndCount = 0;

    for (let i = dataStartIndex; i < fileSize; i++) {
      const b = rawBuffer[i];

      if (b === CR) {
        if (i + 1 < fileSize && rawBuffer[i + 1] === LF) {
          // CRLF pair: skip the CR
          continue;
        } else {
          // Isolated CR: Normalize it into an LF in-place
          rawBuffer[targetIndex++] = LF;
          lineEndCount++;
          continue;
        }
      }

      if (b === LF) {
        lineEndCount++;
      }

      rawBuffer[targetIndex++] = b;
    }

    // 7. Calculate total array size including the trailing padding room
    // targetIndex holds the exact length of the clean text data.
    const textByteLength = targetIndex;
    const paddedLength = textByteLength + paddingLength;

    // Zero out just the 1024 bytes of padding room to prevent memory leaks
	// If there were changes from '\r\n' to '\n' this overwrites those bytes too since it uses 'textByteLength' as the starting position.
    rawBuffer.fill(0, textByteLength, paddedLength);

    // 8. Create a windowed browser view of the padded region with ZERO copying
    const finalUint8Array = new Uint8Array(
      rawBuffer.buffer, 
      rawBuffer.byteOffset, 
      paddedLength
    );

    const formattedPath = formatAbsolutePath(absolutePath);
    database.addAbsolutePath(formattedPath, basename);

    const lineEndString = lineEndingKind === 3 ? '\r\n' : (lineEndingKind === 1 ? '\r' : '\n');

    return {
      paddedUint8Array: finalUint8Array, // Pure standard browser type with 1024 trailing bytes
      textByteLength: textByteLength,    // Tells the Renderer exactly where the text text ends
      fileStartsWithBom: hadBomMark,
      formattedAbsolutePath: formattedPath,
      extension: extension,
      lineEndString: lineEndString,
      lineEndCount: lineEndCount
    };
  }
  catch (err) {
    console.error(err);
    return createEmptyResponse();
  }
  finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (_) {}
    }
  }
}

function createEmptyResponse() {
  return {
    paddedUint8Array: null,
    textByteLength: 0,
    fileStartsWithBom: null,
    formattedAbsolutePath: null,
    extension: null,
    lineEndString: null,
    lineEndCount: null
  };
}

async function setClipboard(event, text) {
	try {
		clipboard.writeText(text);
	}
	catch (err) {
		console.error("Error setting clipboard:", err);
		return [];
	}
}

async function editorSetClipboard(event, uint8Array, offset, length, EDI_lineEndString) {
	try {
		if (!EDI_lineEndString)
			EDI_lineEndString = '\n';

		clipboard.writeText(MAIN_decode_experimental_textonly(uint8Array, offset, length, EDI_lineEndString));
	}
	catch (err) {
		console.error("Error setting clipboard:", err);
		return [];
	}
}

async function readClipboard(event) {
	try {
		return clipboard.readText();
	}
	catch (err) {
		console.error("Error reading clipboard:", err);
		return [];
	}
}

/**
 * TODO: one should probably use ripgrep but I wanna mess around with this myself nevertheless at the least initially.
 * 
 * 
 * This code was written very early on it is a mess...
 * 
 * Streaming it feels like the wrong approach especially if you're gonna...
 * Essentially I think this would be better if you just did it synchronously and rented a buffer and re-used that buffer each time you read the file.
 * You could then read all the text into the buffer.
 * 
 * I still don't think that's all too great but it is probably better than whatever this is...
 * 
 * Maybe if you streamed it and the UI supported that it could be good.
 * But I'm 99% sure the UI locks up anyways at the moment
 */
function findAll(event, searchString, matchWord) {
	try {
		if (!openedDirectory && !workspaceDirectories) return;

		// TODO: optimize the transferral of the data to the renderer process so the typed arrays aren't serialized.
		const result = {
			fileEntries: []
		};

		_findAllMatches.matches_count = 0;

		const search = (new TextEncoder()).encode(searchString);

		let targetDirectory = undefined; // The first loop will have this be undefined so that workspaces can function.
		let childEntries = null;

		const withFileTypesOption = { withFileTypes: true };
		// let stackEntryPoolEntry = null; TODO: Consider a push pop pool of a single object deep causes allocations but (single depth directories that appear one after another) will re-use.
		
		if (openedDirectory) {
			childEntries = fs.readdirSync(openedDirectory, withFileTypesOption);
		}
		else if (workspaceDirectories) {
			childEntries = new Array(workspaceDirectories.length);
			const isDirectoryForcefully = () => true;
			for (let i = 0; i < workspaceDirectories.length; i++) {
				childEntries[i] = {
					name: workspaceDirectories[i].basename,
					absolutePath: workspaceDirectories[i].absolutePath,
					isDirectory: isDirectoryForcefully
				}
			}
		}
		else {
			throw new Error();
		}

		if (childEntries.length === 0) {
			throw new Error();
		}

		let childIndex = 0;

		while (true) {
			const entry = childEntries[childIndex++];

			if (entry.isDirectory()) {
				if (FIND_ALL_IGNORED_DIRS.has(entry.name)) continue;
				const absolutePathOfChild = entry.absolutePath ?? path.join(entry.parentPath, entry.name); // TODO: Presumably there is an API that would provide this more optimally
				const possibleNextEntries = fs.readdirSync(absolutePathOfChild, withFileTypesOption);
				if (possibleNextEntries.length !== 0) {
					if (childIndex < childEntries.length) {
						_findAllStack.push({
							targetDirectory: targetDirectory,
							childEntries,
							childIndex
						});
					}
					targetDirectory = absolutePathOfChild;
					childEntries = possibleNextEntries;
					childIndex = 0;
				}
			}
			else {
				const absolutePathOfChild = path.join(entry.parentPath, entry.name); // TODO: Presumably there is an API that would provide this more optimally
				findAll_searchFile(absolutePathOfChild, search, matchWord);
				if (_findAllMatches.matches_count > 0) {
					database.addAbsolutePath(absolutePathOfChild, entry.name);
					let thisFileMatches = new Uint32Array(_findAllMatches.matches_count);
					thisFileMatches.set(_findAllMatches.matches.subarray(0, _findAllMatches.matches_count), 0);
					result.fileEntries.push({
						absolutePath: absolutePathOfChild,
						filename: entry.name,
						matches: thisFileMatches,
					});
				}
				_findAllMatches.matches_count = 0;
			}

			if (childIndex >= childEntries.length) {
				if (_findAllStack.length > 0) {
					const stackEntry = _findAllStack.pop();
					targetDirectory = stackEntry.targetDirectory;
					childEntries = stackEntry.childEntries;
					childIndex = stackEntry.childIndex;
				}
				else {
					targetDirectory = null;
					childEntries = null;
					childIndex = null;
				}
			}

			if (targetDirectory === null) {
				break;
			}
		}

		return result;
	}
	catch (err) {
		console.error("Error during find-all:", err);
		return [];
	}
	finally {
		_findAllBuffer = null;
	}
}

function findAll_searchFile(absolutePath, searchArgument, matchWord) {
	let fd = null;

	try {
		const stat = fs.statSync(absolutePath);
		const fileSize = stat.size;
		fd = fs.openSync(absolutePath, 'r');

		if (_findAllBuffer === null || _findAllBuffer === undefined || fileSize > _findAllBuffer.length) {
			_findAllBuffer = Buffer.allocUnsafe(fileSize);
		}

		const buffer = _findAllBuffer;
		const search = searchArgument;

		fs.readSync(fd, buffer, 0, fileSize, 0);

		let dataStartIndex = 0;

		// Detect the BOM
		if (fileSize >= 3 &&
			buffer[0] === 0xEF &&
			buffer[1] === 0xBB &&
			buffer[2] === 0xBF) {
				dataStartIndex = 3;
		}

		const CR = 13; // '\r'
		const LF = 10; // '\n'
		let offset = 0;
		let crlfOffset = 0; // Tracks extra '\r' bytes from CRLF pairs

		for (let i = dataStartIndex; i < fileSize; i++) {
			const b = buffer[i];

			// 1. Handle line endings
			if (b === CR || b === LF) {
				offset = 0; // Reset partial match (assumes single-line search)

				// If this is the '\r' of a '\r\n' pair, increment crlfOffset
				if (b === CR && i + 1 < fileSize && buffer[i + 1] === LF) {
					crlfOffset++;
				}
				continue;
			}

			// 2. Standard character matching
			if (b === search[offset]) {
				offset++;
				if (offset === search.length) {
					if (_findAllMatches.matches_count === _findAllMatches.matches_capacity) {
						_findAllMatches.matches_capacity *= 2;
						let upcomingMatches = new Uint32Array(_findAllMatches.matches_capacity);
						upcomingMatches.set(_findAllMatches.matches, 0);
						_findAllMatches.matches = upcomingMatches;
					}

					// Calculate normalized positionIndex (with +1 off-by-one fix)
					_findAllMatches.matches[_findAllMatches.matches_count] = (i - offset + 1) - crlfOffset - dataStartIndex;
					_findAllMatches.matches_count++;
					offset = 0;
				}
			}
			else {
				// Re-check current byte against search[0] so matches like "ccat" aren't missed
				offset = (b === search[0]) ? 1 : 0;
			}
		}
	}
	catch (err) {
		console.error("Error during findAll_searchFile:", err);
		return 0;
	}
	finally {
		if (fd !== null) {
			try { fs.closeSync(fd); } catch (_) { }
		}
	}
}

/** 
 * Returns an object with property 'success' equal to 'true' if success, otherwise the property is equal to 'false'...
 * ...and other properties as well.
 */
async function newFile(event, parentDirectoryAbsolutePath, filename, isDirectory) {
	if (!isValidAbsolutePath(parentDirectoryAbsolutePath)) return;

	/*
	I'm duplicating the code for mkdirSync and writeFile because
	I only want to add the path to the database if the operating system operation was successful.
	I don't like the idea of creating some if statement that occurs after either conditional branch
	in order to put this logic in one place, I'd rather duplicate it.

	As well, neither the renderer process or the main process are storing the absolutepaths.
	So I need to re-interact with the OS file-system to determine what index the new UI will go in.

	Having the main process determine which index changed, and telling the renderer how to update its state accordingly,
	while feeling somewhat wasteful, is still much less expensive than if you were to have the main process
	re-collect all of the children of some directory and send that down to the UI and delete the current children
	from the flat-list and add in this updated list wherein most are equal to what previously was in the flat list that you just deleted.
	*/

	try {
		let pathToNewFile = path.join(parentDirectoryAbsolutePath, filename);
		if (isDirectory) {
			fs.mkdirSync(pathToNewFile);
			let pathId = database.addAbsolutePath(pathToNewFile, filename);
			let indexOf = wrap_readdirSync_indexOf(parentDirectoryAbsolutePath, filename, /*childIsDirectory*/ true);
			return {
				success: true,
				pathId: pathId,
				indexOf: indexOf,
			};
		}
		else {
			fs.writeFileSync(pathToNewFile, 'overwritten?', { flag: 'wx' });
			let pathId = database.addAbsolutePath(pathToNewFile, filename);
			let indexOf = wrap_readdirSync_indexOf(parentDirectoryAbsolutePath, filename, /*childIsDirectory*/ false);
			return {
				success: true,
				pathId: pathId,
				indexOf: indexOf,
			};
		}
	}
	catch (err) {
		console.error("Error making new file:", err);
		return {
			success: false,
		};
	}
}

/**
 * Returns 'true' if success, otherwise 'false'
 * 
 * TODO: delete should remove a row from the DB of absolute paths?
 */
async function deleteFile(event, absolutePath, isDirectory) {
	if (!isValidAbsolutePath(absolutePath)) return false;

	try {
		if (isDirectory) {
			fs.rmSync(absolutePath, { recursive: true });
			return true;
		}
		else {
			fs.unlinkSync(absolutePath);
			return true;
		}
	}
	catch (err) {
		console.error("Error deleting file:", err);
		return false;
	}
}
  
/**
 * Returns an object with property named 'success' equal to 'true' if successful, otherwise the property is equal to'false'...
 * ...as well contains a property named 'pathId' for the "absolute path id" of the row in the database that represents the absolute path...
 * ...as well contains a property named 'absolutePath' for the resulting absolute path string.
 * 
 * TODO: rename should remove the previous named path (provided that a change actually occurred)?
 */
async function renameFile(event, absolutePath, filename, isDirectory) {
	if (!isValidAbsolutePath(absolutePath)) return;

	try {
		if (isDirectory) {
			let directory = path.dirname(absolutePath);
			let pathToNewFile = path.join(directory, filename);
			if (fs.existsSync(pathToNewFile)) {
				throw new Error("The desination path '" + pathToNewFile + "' already exists.");
			}
			fs.renameSync(absolutePath, pathToNewFile);
			let pathId = database.addAbsolutePath(pathToNewFile, filename);
			return {
				success: true,
				pathId: pathId,
				absolutePath: pathToNewFile
			};
		}
		else {
			let directory = path.dirname(absolutePath);
			let pathToNewFile = path.join(directory, filename);
			if (fs.existsSync(pathToNewFile)) {
				throw new Error("The desination path '" + pathToNewFile + "' already exists.");
			}
			fs.renameSync(absolutePath, pathToNewFile);
			let pathId = database.addAbsolutePath(pathToNewFile, filename);
			return {
				success: true,
				pathId: pathId,
				absolutePath: pathToNewFile
			};
		}
	}
	catch (err) {
		console.error("Error renaming file:", err);
		return {
			success: false,
			pathId: pathId
		};
	}
}

async function editorSaveFile(event, absolutePath, uint8Array, count, EDI_lineEndString, EDI_fileStartsWithBom) {
	if (!isValidAbsolutePath(absolutePath)) return;

	try {
		const stats = fs.statSync(absolutePath);
		if (stats.isDirectory()) {
			throw new Error('The destination path is a directory');
		}

		if (!EDI_lineEndString)
			EDI_lineEndString = '\n';

		fs.writeFileSync(absolutePath, MAIN_decode_experimental_textonly(uint8Array, /*start*/ 0, count, EDI_lineEndString, EDI_fileStartsWithBom));
	}
	catch (err) {
		console.error("Error saving file:", err);
		return [];
	}
}

async function editorSaveFileAs(event, uint8Array, count, EDI_lineEndString, EDI_fileStartsWithBom) {

	const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);

	// Configure the native "Save As" dialog box
	const { canceled, filePath } = await dialog.showSaveDialog(win, {
		title: 'Save File As',
		//defaultPath: path.join(app.getPath('downloads'), 'untitled.txt'), // Default folder & name
		filters: [
			{ name: 'Text Files', extensions: ['txt'] },
			{ name: 'All Files', extensions: ['*'] }
		]
	});

	// If the user cancelled the dialog, return false
	if (canceled || !filePath) {
		return { success: false, canceled: true };
	}

	try {
		// Write data to the user's selected path
		// use parameter ", 'utf-8'?"
		const basename = path.basename(filePath);
		const formattedAbsolutePath = formatAbsolutePath(filePath);
		const text = MAIN_decode_experimental_textonly(uint8Array, /*start*/ 0, count, EDI_lineEndString, EDI_fileStartsWithBom);
		fs.writeFileSync(filePath, text);
		let pathId = database.addAbsolutePath(filePath, basename);
		pathId = database.addAbsolutePath(formattedAbsolutePath, basename);
		return { success: true, absolutePath:filePath, formattedAbsolutePath:formattedAbsolutePath };
	} catch (error) {
		return { success: false, error: error.message };
	}
}

/**
 * Returns an object with property 'success' equal to 'true' if success, otherwise the property is equal to 'false'...
 * ...and other properties as well.
 */
async function pasteClipboardAbsolutePathToDirectory(event, directory, menuOptionCut_id) {
	if (!isValidAbsolutePath(directory)) return;

	try {
		let sourceFile = clipboard.readText();
		if (!sourceFile.startsWith('file:///')) {
			throw new Error("The clipboard's text does not start with 'file:///'.");
		}
		let sourceWasMenuOptionCut = sourceFile === menuOptionCut_id;
		sourceFile = sourceFile.substring('file:///'.length);
		if (!fs.existsSync(sourceFile)) {
			throw new Error("The clipboard does not contain a path to a file.");
		}
		if (!isValidAbsolutePath(sourceFile)) return;
		const stats = fs.statSync(sourceFile);
		let filename = path.basename(sourceFile);
		let destinationFile = path.join(directory, filename);
		if (stats.isDirectory()) {
			fs.cpSync(sourceFile, destinationFile, { force: false, errorOnExist: true, recursive: true });
			let pathId = database.addAbsolutePath(destinationFile, filename);
			let sourceFileWasDeleted = false;
			if (sourceWasMenuOptionCut && fs.existsSync(destinationFile)) {
				fs.rmSync(sourceFile, { recursive: true });
				sourceFileWasDeleted = true;
			}
			let indexOf = wrap_readdirSync_indexOf(directory, filename, /*childIsDirectory*/ true);
			return {
				success: true,
				pathId: pathId,
				indexOf: indexOf,
				isDirectory: true,
				sourceFileWasDeleted: sourceFileWasDeleted,
			};
		}
		else {
			fs.copyFileSync(sourceFile, destinationFile, fs.constants.COPYFILE_EXCL);
			let pathId = database.addAbsolutePath(destinationFile, filename);
			let sourceFileWasDeleted = false;
			if (sourceWasMenuOptionCut && fs.existsSync(destinationFile)) {
				fs.unlinkSync(sourceFile);
				sourceFileWasDeleted = true;
			}
			let indexOf = wrap_readdirSync_indexOf(directory, filename, /*childIsDirectory*/ false);
			return {
				success: true,
				pathId: pathId,
				indexOf: indexOf,
				isDirectory: false,
				sourceFileWasDeleted: sourceFileWasDeleted,
			};
		}
	}
	catch (err) {
		console.error("Error copying file:", err);
		return {
			success: false
		};
	}
}
