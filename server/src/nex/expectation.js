/*
This file is part of Vodka.

Vodka is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Vodka is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Vodka.  If not, see <https://www.gnu.org/licenses/>.
*/

var FF_GEN = 0;



class Expectation extends NexContainer {
	constructor() {
		super()
		this.fff = null;
		this.isSet = false;
		this.lambdaLexicalEnvironment = null;
	}

	copyFieldsTo(nex) {
		super.copyFieldsTo(nex);
		nex.fff = this.fff;
	}

	ffWith(fff, closure) {
		this.fff = fff;
		this.ffgen = FF_GEN;
		this.fffClosure = closure;
		this.lambdaLexicalEnvironment = fff.lexicalEnv;
	}

	getCallbackForSet() {
		this.isSet = true;
		return (function(result) {
			eventQueue.enqueueExpectationFulfill(this, result);
		}).bind(this);
	}

	drainChildren() {
		// in the error case there may be more than one child but we
		// follow the same path so we drain all here
		while(this.numChildren() > 0) {
			this.removeChildAt(0);
		}
	}

	fulfill(result) {
		if (this.ffgen < FF_GEN) {
			return;
		}
		if (!result) {
			if (this.numChildren() != 1) {
				result = new EError("expectation needs one child to be fulfilled")
			} else {
				result = this.getChildAt(0);
				if (this.fff) {
					// the lambda's lexical environment can change (not the symbols stored
					// in it, but their VALUES) if the code that the lambda appears in
					// is executed more than once. At the time we set ffWith,
					// we need to record the lexical environment at that time,
					// so that if the lexical environment changes again between
					// now and the time the expectation is fullfilled, because the code
					// containing the lambda is evaluated again, the expectation
					// can restore the lexical environment to the way it was
					// when it is fulfilled.

					this.fff.lexicalEnv = this.lambdaLexicalEnvironment;
					let cmd = new Command('');
					// also. The way I am doing this is problematic because the lambda has
					// ALREADY been evaluated and has a lexical environment, but if I
					// put put it in as the first child of the command,
					// the machinery inside command will thing that someone did this:
					// (~ (& ...) a b c)
					// and will evaluate the lambda AGAIN to grab a new lexical environment.
					cmd.setFirstLambdaChildHasAlreadyBeenEvaluated(true);
					cmd.appendChild(this.fff);
					cmd.appendChild(result);;
					result = evaluateNexSafely(cmd, this.fffClosure);
				}
			}
		}
		this.isSet = false;
		this.drainChildren();
		this.appendChild(result);
		this.renderOnlyThisNex(null);

	}

	cancel() {
		this.ffgen--;
	}

	// standard nex stuff below

	toString() {
		return `*(${super.childrenToString()}*)`;
	}

	getTypeName() {
		return '-expectation-';
	}

	makeCopy(shallow) {
		let r = new Expectation();
		this.copyFieldsTo(r);
		this.copyChildrenTo(r, shallow);
		return r;
	}

	getContextType() {
		return ContextType.COMMAND;
	}

	renderInto(renderNode, renderFlags) {
		let domNode = renderNode.getDomNode();
		let dotspan = null;
		if (!(renderFlags & RENDER_FLAG_SHALLOW)) {
			dotspan = document.createElement("span");
			dotspan.classList.add('dotspan');
			domNode.appendChild(dotspan);
		}
		super.renderInto(renderNode, renderFlags);
		domNode.classList.add('expectation');
		if (!(renderFlags & RENDER_FLAG_SHALLOW)) {
			if (renderFlags & RENDER_FLAG_EXPLODED) {
				dotspan.classList.add('exploded');
			} else {
				dotspan.classList.remove('exploded');
			}
			this.unsetDotSpanPaddingClasses(dotspan);
			this.setDotSpanPaddingClass(dotspan);
			dotspan.innerHTML = this.getDotSpanHTML();
		}
	}

	getDotSpanHTML() {
		// if (this.unlimited) {
		// 	return '...';
		// }
		if (this.isSet) {
			return '*';
		}
		// if (this.fff) {
		// 	return '..';
		// }
		return '.';
	}

	unsetDotSpanPaddingClasses(dotspan) {
		dotspan.classList.remove('fulfilled');
 		dotspan.classList.remove('threedots');
	}

	setDotSpanPaddingClass(dotspan) {
		// if (this.unlimited) {
		// 	dotspan.classList.add('threedots');
		// } else
		if (this.isSet) {
			dotspan.classList.add('fulfilled');
		// } else if (this.fff) {
		// 	dotspan.classList.add('twodots');
		}
	}

	callDeleteHandler() {
		this.cancel();
	}

	isEmpty() {
		return true;
	}

	getKeyFunnel() {
		return new ExpectationKeyFunnel(this);
	}

	deleteLastLetter() {}

	appendText(txt) {}

	defaultHandle(txt) {
		if (isNormallyHandled(txt)) {
			return false;
		}
		let letterRegex = /^[a-zA-Z0-9']$/;
		let isSeparator = !letterRegex.test(txt);

		let toInsert = null;
		if (isSeparator) {
			toInsert = new Separator(txt);
		} else {
			toInsert = new Letter(txt);
		}
		if (this.hasChildren()) {
			manipulator.insertAfterSelectedAndSelect(toInsert)
		} else {
			manipulator.appendAndSelect(toInsert);
		}
		return true;
	}

	getEventTable(context) {
		// most of these have no tests?
		return {
			'ShiftEnter': 'return-exp-child',
			'Enter': 'do-line-break-always',
			// special stuff for expectations that gets rid of the js timeout
			'ShiftBackspace': 'call-delete-handler-then-remove-selected-and-select-previous-sibling',
			'Backspace': 'call-delete-handler-then-remove-selected-and-select-previous-sibling',
		}
	}
}