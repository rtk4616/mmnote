const fs = require("fs")
require("./codemirror-ext")



class NoteEditor {
    constructor($container) {
        this.$container = $container
        this.cm = CodeMirror($container.get(0))

        // let events = ['change','changes','beforeChange']
        // events.forEach( (event) => {
        //     this.cm.on(event, function (cm, arg1) {
        //         console.log("codemirror event: " + event, arg1);
        //     });
        // });

        this.cm.on('change', (cm, changeObj) => {
            let doc = cm.getDoc();
            let note = doc.mmGetNote();
            note.update(doc.getValue()); // getValue()是否低效？
        })
    }

    open(note) {
        this.cm.mmSwapDocByNote(note, 'gfm', () => {
            return note.readContent();
        });
        this.cm.focus();
    }

    close(note) {
        this.cm.mmCloseDocByNote(note);   
    }
}




module.exports = NoteEditor