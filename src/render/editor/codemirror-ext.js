CodeMirror.defineDocExtension('mmSetMetaInfo', function (key, value) {
    let doc = this

    if (!doc.mmMetaInfo) {
        doc.mmMetaInfo = {};
    }
    if (key === undefined || key === null) return;

    doc.mmMetaInfo[key] = value;
});

CodeMirror.defineDocExtension('mmGetMetaInfo', function (key) {
    let doc = this;

    if (!key) return doc.mmMetaInfo;

    return doc.mmMetaInfo ? doc.mmMetaInfo[key] : undefined;
});

["Note"].forEach(function (key) {
    CodeMirror.defineDocExtension(`mmSet${key}`, function (value) {
        let doc = this;
        doc.mmSetMetaInfo(key.toLowerCase(), value);
    });

    CodeMirror.defineDocExtension(`mmGet${key}`, function () {
        let doc = this;
        return doc.mmGetMetaInfo(key.toLowerCase());
    });
});

CodeMirror.defineExtension('mmSwapDocByNote', function (note, mode, getContent, newDocSwapCallback) {
    // console.log('mmSwapDocByNote ', note, mode, getContent, newDocSwapCallback);
    let cm = this;

    if (!cm.mmDocMap) {
        cm.mmDocMap = new Map();
    }

    if (cm.mmDocMap.has(note.uriString)) {
        if (cm.mmDocMap.get(note.uriString) !== cm.getDoc()) {
            cm.swapDoc(cm.mmDocMap.get(note.uriString));
        }
    } else {
        let newDoc = CodeMirror.Doc(getContent(), mode);
        newDoc.mmSetNote(note);
        cm.mmDocMap.set(note.uriString, newDoc);
        cm.swapDoc(newDoc);

        if (newDocSwapCallback) {
            newDocSwapCallback(cm, newDoc);
        }
    }
});

// 如何销毁一个doc？
CodeMirror.defineExtension('mmCloseDocByNote', function(note){
    let cm = this;

    if (cm.mmDocMap && cm.mmDocMap.has(note.uriString)) {
        
    }
});