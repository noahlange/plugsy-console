interface ISimpleConsoleOptions {
  outputOnly?: boolean;
  placeholder?: string;
  storageID?: string;
  autofocus?: boolean;
  autocomplete?: (value: string) => string[];
  handleCommand: (command: string) => void;
}

// based off 1j01's simple-console
export default class SimpleConsole {
  public autocomplete: (str: string) => string[];
  public handleCommand: (command: string) => void;

  public commandHistory: string[] = [];
  public storageID: string = 'simple-console';
  public autofocus: boolean = false;
  public commandIndex: number = 0;
  public enabled: boolean = false;
  public lastEntry: HTMLElement | null = null;
  public input: HTMLInputElement;
  public inputWrapper: HTMLElement;

  public element = document.createElement('div');
  public output: HTMLElement = document.createElement('div');

  public handle = {
    down: (e: KeyboardEvent) => {
      const input = this.input;
      // Down
      input.value = this.commandHistory[++this.commandIndex] || '';
      this.commandIndex = Math.min(
        this.commandHistory.length,
        this.commandIndex
      );
      input.setSelectionRange(input.value.length, input.value.length);
      e.preventDefault();
    },
    enter: (e: KeyboardEvent) => {
      // Enter
      const command = this.input.value;
      if (command === '') {
        return;
      }
      this.input.value = '';
      if (this.commandHistory[this.commandIndex - 1] !== command) {
        this.commandHistory.push(command);
        this.commandIndex++;
      }
      this.saveCommandHistory();
      const entry = this.log(command);
      entry.classList.add('input');
      this.addChevron(entry);
      this.scrollToBottom();
      this.handleCommand(command);
    },
    shiftDelete: (e: KeyboardEvent) => {
      const input = this.input;
      // Shift+Delete
      if (input.value === this.commandHistory[this.commandIndex]) {
        this.commandHistory.splice(this.commandIndex, 1);
        this.commandIndex = Math.max(0, this.commandIndex - 1);
        input.value = this.commandHistory[this.commandIndex] || '';
        this.saveCommandHistory();
      }
      e.preventDefault();
    },
    tab: (e: KeyboardEvent) => {
      const input = this.input;
      if (input.value) {
        const opts = this.autocomplete(input.value);
        if (opts[0]) {
          input.value = opts[0];
          input.setSelectionRange(input.value.length, input.value.length);
        }
        e.preventDefault();
        return false;
      }
    },
    up: (e: KeyboardEvent) => {
      // Up
      const input = this.input;
      this.commandIndex = Math.max(--this.commandIndex, 0);
      input.value = this.commandHistory[this.commandIndex] || '';
      input.setSelectionRange(input.value.length, input.value.length);
      e.preventDefault();
    }
  };

  public constructor(options: ISimpleConsoleOptions) {
    if (!options.handleCommand && !options.outputOnly) {
      throw new Error(
        'You must specify either options.handleCommand(input) or options.outputOnly'
      );
    }

    this.loadCommandHistory();
    const outputOnly = options.outputOnly;
    const placeholder = options.placeholder || '';
    this.handleCommand = options.handleCommand;
    this.autocomplete = options.autocomplete || (() => []);
    this.autofocus = options.autofocus || false;
    this.storageID = options.storageID || this.storageID;

    this.element = document.createElement('div');
    this.element.className = 'simple-console';

    this.output.className = 'simple-console-output';
    this.output.setAttribute('role', 'log');
    this.output.setAttribute('aria-live', 'polite');

    this.inputWrapper = document.createElement('div');
    this.inputWrapper.className = 'simple-console-input-wrapper';
    this.addChevron(this.inputWrapper);

    this.input = document.createElement('input');
    this.input.className = 'simple-console-input';
    this.input.setAttribute('autofocus', this.autofocus ? 'autofocus' : '');
    this.input.setAttribute('placeholder', placeholder);
    this.input.setAttribute('aria-label', placeholder);

    this.element.appendChild(this.output);
    if (!outputOnly) {
      this.element.appendChild(this.inputWrapper);
    }
    this.inputWrapper.appendChild(this.input);
    this.input.addEventListener('keydown', this.keydown);
  }

  public keydown = (e: KeyboardEvent) => {
    if (!this.enabled) {
      return;
    }
    switch (e.key) {
      case 'Tab':
        this.handle.tab(e);
        break;
      case 'Delete':
        if (e.shiftKey) {
          this.handle.shiftDelete(e);
        }
        break;
      case 'Enter':
        this.handle.enter(e);
        break;
      case 'ArrowUp':
        this.handle.up(e);
        break;
      case 'ArrowDown':
        this.handle.down(e);
        break;
    }
  };

  public get commandHistoryKey() {
    return this.storageID + ' command history';
  }

  public scrollToBottom() {
    this.output.scrollTop = this.output.scrollHeight;
  }

  public isScrolledToBottom() {
    // 1px margin of error needed in case the user is zoomed in
    return (
      this.output.scrollTop + this.output.clientHeight + 1 >=
      this.output.scrollHeight
    );
  }

  public getLastEntry() {
    return this.lastEntry;
  }

  public addChevron(toElement: HTMLElement) {
    this.addSVG(
      toElement,
      'input-chevron',
      '<path d="M6,4L10,8L6,12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>'
    );
  }

  public addSVG(
    toElement: HTMLElement,
    iconClassName: string,
    svg: string,
    viewBox: string = '0 0 16 16'
  ) {
    const icon = document.createElement('span');
    icon.className = iconClassName;
    icon.innerHTML = `<svg width="1em" height="1em" viewBox="${viewBox}">${svg}</svg>`;
    toElement.insertBefore(icon, toElement.firstChild);
  }

  public warn(content: string | HTMLElement) {
    this.log(content);
    const e = this.getLastEntry();
    if (e) {
      e.classList.add('warning');
    }
  }

  public error(content: string | HTMLElement) {
    this.log(content);
    const e = this.getLastEntry();
    if (e) {
      e.classList.add('error');
    }
  }

  public info(content: string | HTMLElement) {
    this.log(content);
    const e = this.getLastEntry();
    if (e) {
      e.classList.add('info');
    }
  }

  public success(content: string | HTMLElement) {
    this.log(content);
    const e = this.getLastEntry();
    if (e) {
      e.classList.add('success');
    }
  }

  public log(content: string | HTMLElement) {
    const wasScrolledToBottom = this.isScrolledToBottom();

    const entry = document.createElement('div');
    entry.className = 'entry';
    if (content instanceof Element) {
      entry.appendChild(content);
    } else {
      entry.innerText = entry.textContent = content;
    }
    this.output.appendChild(entry);

    requestAnimationFrame(() => {
      if (wasScrolledToBottom) {
        this.scrollToBottom();
      }
    });

    this.lastEntry = entry;
    return entry;
  }

  public saveCommandHistory() {
    try {
      localStorage[this.commandHistoryKey] = JSON.stringify(
        this.commandHistory
      );
    } catch (e) {
      return;
    }
  }

  public loadCommandHistory() {
    try {
      this.commandHistory =
        JSON.parse(localStorage[this.commandHistoryKey]) || [];
      this.commandIndex = this.commandHistory.length;
    } catch (e) {
      return;
    }
  }

  public logHTML(html: string) {
    this.log('');
    const e = this.getLastEntry();
    if (e) {
      e.innerHTML = html;
    }
  }

  public clear() {
    this.output.innerHTML = '';
  }

  public handleUncaughtErrors() {
    window.addEventListener('error', e => {
      this.error(e.message);
    });
  }
}
