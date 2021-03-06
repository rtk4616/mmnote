const fs = require('fs-extra');
const p = require("path")
const EventEmitter = require('eventemitter3')
const _ = require("lodash");
const Note = require("./editor/note");
const URI = require('../common/uri');

class Model extends EventEmitter {
    static get EVENTS() {
        return {
            reset: 'reset',  // target
            projectChange: 'projectChange',  // target
            openNote: 'openNote', // target, note, index
            activeNote: 'activeNote', // target, note, index
            closeNote: 'closeNote', // target, note, index
            updateNote: 'updateNote', // target, note, index

            noteEvent: 'noteEvent' // target, eventName, noteEventTarget, ...noteEventArgs
        }
    }

    constructor() {
        super();
        window._d.model = this;

        this._reset();
    }

    emit(...args) {
        console.log(`Model emit[%c${args[0]}%c] ${args.slice(2)}`, 'color:red', '')
        this._log();
        super.emit(...args);
    }

    _reset(){
        // 打开的工程的目录树
        this._treeNodes = []

        // 打开的笔记列表
        this._openNoteMap = new Map();
        this._openNoteUriStrOrderArr = []
        this._activeNoteUriStrHistoryArr = []

        // 当前编辑的笔记
        this._activeNote = null;

        // 清空note缓存
        Note.emptyCache();

        this.emit(Model.EVENTS.reset, this);
    }

    openProject(folderPath) {
        this._reset();

        let stats = fs.statSync(folderPath);
        let name = p.basename(folderPath);
        let rootNode = {
            name, path: folderPath, open: true, children: [], stats: stats
        }
        this._treeNodes.push(rootNode);

        return this._load(folderPath, rootNode).then(() => {
            this.emit(Model.EVENTS.projectChange, this);
        });
    }

    _load(folderPath, parentNode) {
        return fs.readdir(folderPath).then((files) => {

            let promises = []
            for (let file of files) {
                let filePath = p.join(folderPath, file)
                promises.push(fs.stat(filePath).then((stats) => {
                    let node = { name: file, path: filePath, children: [], stats, uri: URI.file(filePath).toString() }
                    parentNode.children.push(node);
                    if (stats.isDirectory()) {
                        return this._load(filePath, node)
                    }
                }))
            }

            return Promise.all(promises)
        })
    }

    _getNoteIndex(note) {
        if (!note) return -1;
        return this._openNoteUriStrOrderArr.indexOf(note.uriString);
    }

    _getActiveNoteIndex() {
        return this._getNoteIndex(this._activeNote);
    }

    _delegateNoteEvent(note) {
        _.each(Note.EVENTS, (eventName) => {
            note.on(eventName, (target, ...args) => {
                this.emit(Model.EVENTS.noteEvent, this, eventName, target, ...args)
            });
        });
    }

    _getUntitleIndexArr() {
        let indexArr = []
        this._openNoteMap.forEach(note => {
            if (note.isUnTitled) {
                indexArr.push(note.untitledIndex)
            }
        });
        _.sortBy(indexArr)
        return indexArr
    }

    newNote() {
        let untitledInexArr = this._getUntitleIndexArr()
        let newIndex = null;
        if (untitledInexArr.length == 0) {
            newIndex = 0;
        } else {
            for(let i = 0;;i++){
                if(untitledInexArr.indexOf(i) == -1){
                    newIndex = i;
                    break;
                }
            }
        }

        let newNote = Note.createUntitle(newIndex, 'text/markdown');
        this.openNote(newNote);
    }

    openNote(note) {
        if (typeof note === 'string') note = Note.create(note);
        if (this._activeNote === note) return;
        if (this._openNoteMap.has(note.uriString)) {
            return this.activeNote(note);
        }

        this._openNoteMap.set(note.uriString, note);

        let curNoteIdex = this._getActiveNoteIndex() + 1
        this._openNoteUriStrOrderArr.splice(curNoteIdex, 0, note.uriString);

        // 代理note的事件
        this._delegateNoteEvent(note);

        this.emit(Model.EVENTS.openNote, this, note, curNoteIdex);
        this.activeNote(note);
    }

    activeNote(note) {
        if (typeof note === 'string') note = Note.create(note);
        if (this._activeNote === note) return;

        this._activeNote = note;
        this._activeNoteUriStrHistoryArr.push(note.uriString);
        let activeNoteIndex = this._getActiveNoteIndex();

        this.emit(Model.EVENTS.activeNote, this, note, activeNoteIndex);
    }

    _activePrevNote() {
        this._activeNoteUriStrHistoryArr.pop()
        let lastActiveTabUriStr = _.last(this._activeNoteUriStrHistoryArr)
        if (!lastActiveTabUriStr){
            this._activeNote = null;
        }else{
            this._activeNote = this._openNoteMap.get(lastActiveTabUriStr)
        }

        this.emit(Model.EVENTS.activeNote, this, this._activeNote);
    }

    closeNote(note) {
        if (typeof note === 'string') note = Note.create(note);
        if (!this._openNoteMap.has(note.uriString)) {
            return;
        }

        // TODO 关闭对note事件的代理

        let noteIndex = this._getNoteIndex(note)
        this._openNoteMap.delete(note.uriString)
        _.pull(this._openNoteUriStrOrderArr, note.uriString)
        _.pull(this._activeNoteUriStrHistoryArr, note.uriString)

        if (this._activeNote === note) {
            this._activePrevNote()
        }

        this.emit(Model.EVENTS.closeNote, this, note, noteIndex);
        note.close();
    }

    saveNote(note) {
        if (!note) note = this._activeNote;
        if (!note) return;

        note.save();
    }

    _log() {
        let prefix = '    '
        let prefix2 = '      '
        console.log(prefix + "_openNoteMap: \n" + _.map([...this._openNoteMap.values()], x => prefix2 + x.uriString).join("\n"));
        console.log(prefix + "_openNoteUriStrOrderArr: \n" + _.map(this._openNoteUriStrOrderArr, x => prefix2 + x).join("\n"));
    }
}

module.exports = Model;