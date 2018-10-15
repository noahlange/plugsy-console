// @ts-ignore
import md from 'md';

import Plugin, { command } from 'plugsy';
import SimpleConsole from './vendor/simple-console';

import 'simple-console/simple-console.css';
import './vendor/styles.css';

/*:
 * @plugindesc Sample RMMV plugin built using Plugsy.
 * @author Your Name Here
 * ...other comments...
 */
export default class Plugsy extends Plugin {
  public open = false;

  protected handle: number | null = null;
  protected term: SimpleConsole = new SimpleConsole({
    autocomplete: this.autocomplete.bind(this),
    handleCommand: this.handleCommand.bind(this),
  });

  @command('lists installed plugsy commands')
  public list() {
    this.term.log($plugsy.commands.join('\n'));
  }

  public autocomplete(value: string) {
    return $plugsy.commands.filter(f => f.startsWith(value));
  }

  public mousedown = (e: MouseEvent) => {
    if (this.open) {
      e.stopPropagation();
    }
  };

  public keydown = (e: KeyboardEvent) => {
    if (this.open) {
      e.stopPropagation();
    }
    if (e.key === '`') {
      this.toggle();
      e.preventDefault();
      e.stopPropagation();
    }
  };


  public uninstall() {
    document.body.removeChild(this.term.element);
    document.body.removeEventListener('mousedown', this.mousedown);
  }

  public install() {
    super.install();
    document.body.insertBefore(this.term.element, document.body.firstChild);
    document.body.addEventListener('mousedown', this.mousedown);
    document.body.addEventListener('keydown', this.keydown);
    document.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        if (this.open) {
          e.stopPropagation();
          return true;
        }
      },
      { capture: true }
    );
    this.term.element.classList.add('dark');
  }

  protected toggle() {
    this.term.element.classList.toggle('open');
    this.term.enabled = this.open = !this.open;
    if (this.open) {
      this.term.input.focus();
    }
  }

  protected handleCommand(cmd: string) {
    const c = cmd
      .split(' ')
      .slice(0, 2)
      .join(' ');

    if ($plugsy.commands.indexOf(c) > -1) {
      const id = $dataCommonEvents.length;
      // @ts-ignore, illegal property access
      const switches = $gameSwitches._data;
      switches[id] = true;

      $dataCommonEvents[id] = {
        id: 1,
        list: [{ code: 0, indent: 0, parameters: [] }],
        name: '',
        switchId: id,
        trigger: 2
      };

      try {
        const event = new Game_CommonEvent(id);
        const [ pc, ...args] = cmd.split(' ');
        // @ts-ignore, illegal property access
        const interpreter = event._interpreter;
        const result = interpreter.pluginCommand(pc, [ args.join(' ') ]) as any;
        if (result) {
          this.term.logHTML(
            md(result, { headerIds: false, tables: false, xhtml: false })
          );
        }
        delete $dataCommonEvents[id];
        delete switches[id];
      } catch (e) {
        // tslint:disable-next-line
        console.error(e);
        this.term.error(`Command "${c}" failed.`);
      }
    } else {
      this.term.warn(`No such command "${c}"`);
    }
  }
}

$plugsy.install(Plugsy);
