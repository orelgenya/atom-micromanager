'use babel';

import AtomMicromanagerView from './atom-micromanager-view';
import { CompositeDisposable, Range, Point } from 'atom';

// const TextBuffer = require('text-buffer')
// const {Point, Range} = TextBuffer

export default {

  atomMicromanagerView: null,
  modalPanel: null,
  subscriptions: null,
  markers: {
    'item': '-',
    'question': '?',
    'outcome': '=>',
    'in-progress': '.',
    'done': 'v',
    'rejected': 'x',
  },

  activate(state) {
    this.atomMicromanagerView = new AtomMicromanagerView(state.atomMicromanagerViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.atomMicromanagerView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-micromanager:toggle': () => this.toggle(),
      'atom-micromanager:create-sibling-item': () => this.createItem('sibling'),
      'atom-micromanager:create-child-item': () => this.createItem('child'),
      'atom-micromanager:set-item-state-item': () => this.setItemState('item'),
      'atom-micromanager:set-item-state-outcome': () => this.setItemState('outcome'),
      'atom-micromanager:set-item-state-question': () => this.setItemState('question'),
      'atom-micromanager:set-item-state-done': () => this.setItemState('done'),
      'atom-micromanager:set-item-state-in-progress': () => this.setItemState('in-progress'),
      'atom-micromanager:set-item-state-rejected': () => this.setItemState('rejected')
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.atomMicromanagerView.destroy();
  },

  serialize() {
    return {
      atomMicromanagerViewState: this.atomMicromanagerView.serialize()
    };
  },

  toggle() {
    console.log('AtomMicromanager was toggled!');

    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    editor.scan(/^\s*(-)/g, it => {
      let marker = editor.markBufferRange(new Range(
        new Point(it.range.end.row, it.range.end.column - 1), it.range.end));
      editor.decorateMarker(marker, {
        type: 'text',
        class: 'mm-start text-hide icon icon-device-desktop'
      });
      editor.decorateMarker(marker, {
        type: 'line',
        class: 'mm-line'
      });
    });

    editor.scan(/#[a-zA-Z]+\s?/g, it => {
      let marker = editor.markBufferRange(it.range, {type: 'hashtag'});
      editor.decorateMarker(marker, {
        type: 'text',
        class: 'mm-hashtag text-hide'
      });
      editor.decorateMarker(marker, {
        type: 'line',
        class: 'mm-line-' + it.matchText.substring(1)
      });
    });

    // return (
    //   this.modalPanel.isVisible() ?
    //   this.modalPanel.hide() :
    //   this.modalPanel.show()
    // );
  },

  createItem(type) {
    console.log('createItem was toggled! type = ' + type);

    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    let row = editor.getCursorBufferPosition().row;
    let line = editor.lineTextForBufferRow(row);
    let onNextLine = !!line.length;
    let nextRow = onNextLine ? row + 1 : row;
    let indentation = editor.indentationForBufferRow(row);

    if (onNextLine) {
      editor.insertNewlineBelow();
    }

    editor.insertText('- ');

    if (type == 'child') {
      editor.setIndentationForBufferRow(nextRow, indentation + 1);
    }
  },

  setItemState(state) {
    console.log('setItemState was toggled! with state = ' + state);

    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    let row = editor.getCursorBufferPosition().row;
    let indentation = editor.indentationForBufferRow(row);
    let line = editor.lineTextForBufferRow(row);

    let currentState = this.getCurrentStateMarker(line);
    let currentRange = !currentState ? new Range([row, 0], [row, 0]) :
    new Range(
      [row, currentState.pos],
      [row, currentState.pos + currentState.marker.length]
    );
    let text = this.markers[state];
    if (!currentState) {
      text += ' ';
    }
    editor.setTextInBufferRange(currentRange, text);
  },

  getCurrentStateMarker(line) {
    let i, ch, pos, word = "";
    // skip indent
    for (i = 0; i < line.length; i++) {
      ch = line.charAt(i);
      if (ch != ' ') break;
    }
    pos = i;

    // read word
    for (; i < line.length; i++) {
      ch = line.charAt(i);
      if (ch == ' ') break;
      word += ch;
    }

    // match to item type
    for (var type in this.markers) {
      if (this.markers[type] == word) {
        return { marker: this.markers[type], pos };
      }
    }
  }

};
