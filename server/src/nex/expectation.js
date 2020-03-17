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



class Expectation extends NexContainer {
	constructor(hackfunction) {
		super()
		this.hackfunction = hackfunction;
		this.completionlisteners = [];
		this.parentlist = [];
		// fff is somehow more readable than "fulfillfunction"
		// like I don't have to remember how to spell it
		this.fff = null;
		this.ffed = false;
		this.discontinued = false;
	}

	toString() {
		return `*(${super.childrenToString()}*)`;
	}


	copyFieldsTo(nex) {
		super.copyFieldsTo(nex);
		nex.deleteHandler = this.deleteHandler;
		nex.fff = this.fff;
		// notably we do NOT copy ffed because
		// if the original one is already fulfilled, we might want
		// to make a copy of it so it can be fulfilled again.
	}

	discontinue() {
		this.discontinued = true;
	}

	setFFF(f) {
		this.fff = f;
	}

	addParent(parent) {
		this.parentlist.push(parent);
	}

	addCompletionListener(listener) {
		this.completionlisteners.push(listener);
	}

	getTypeName() {
		return '-expectation-';
	}

	setDeleteHandler(f) {
		this.deleteHandler = f;
	}

	evaluate(env) {
		ILVL++;
		// if discontinued this will just be itself
		let rval = this.getFulfilledThing();
		ILVL--;
		return rval;
	}

	insertChildAt(c, i) {
		if (i > 1) {
			throw new EError('Expectation cannot have more than one child.');
		} else {
			super.insertChildAt(c, i);
		}
	}

	callDeleteHandler() {
		if (this.deleteHandler) {
			this.deleteHandler();
		}
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
			dotspan.innerHTML = '...';
		}
	}

	isEmpty() {
		return true;
	}

	getKeyFunnel() {
		return new ExpectationKeyFunnel(this);
	}

	deleteLastLetter() {}

	appendText(txt) {}

	getAddressesOfThisInParent(parent) {
		let addresses = [];
		for (let i = 0; i < parent.numChildren(); i++) {
			let child = parent.getChildAt(i);
			if (child.getID() == this.getID()) {
				// it's the same one
				addresses.push(i);
			}
		}
		return addresses;
	}

	getFulfilledThing(passedInFFF) {
		if (this.discontinued) {
			return this;
		}
		if (this.ffed) {
			throw new EError('Cannot fulfill an already-fulfilled expectation');
		}
		if (!this.fff) {
			// either it was passed in or um
			if (passedInFFF) {
				if ((typeof passedInFFF) == 'function') {
					this.fff = passedInFFF;
				} else {
					this.fff = function() {
						return passedInFFF;
					};
				}
			} else {
				this.fff = (function() {
					return this.getChildAt(0);
				}).bind(this);
			}
		}
		this.ffed = true;
		return this.fff();
	}

	checkChildren() {
		if (this.numChildren() == 0) {
			throw new EError("cannot fulfill an empty expectation");
		}
		if (this.numChildren() > 1) {
			throw new EError("expectation cannot have more than one value");
		}
	}

	fulfill(passedInFFF) {
		this.checkChildren();
		let newnex = this.getFulfilledThing(passedInFFF);

		// fuckery here
		// for each parent, look at all its children and find out
		// whether this expectation is still a child.
		// If it is, replace with the thing.
		// then do a global rerender.
		for (let i = 0; i < this.parentlist.length; i++) {
			let parent = this.parentlist[i];
			let addresses = this.getAddressesOfThisInParent(parent);
			for (let j = 0; j < addresses.length; j++) {
				let addr = addresses[j];
				parent.replaceChildAt(newnex, addr);
			}
		}
		// we don't know where the expectations are so we have to render everything.

		if (this.getRenderNodes()[0] && this.getRenderNodes()[0].isSelected()) {
			PRIORITYQUEUE ? eventQueue.enqueueTopLevelRenderSelectingNode(newnex) : topLevelRenderSelectingNode(newnex);
		} else {
			PRIORITYQUEUE ? eventQueue.enqueueTopLevelRender(newnex) : topLevelRender(newnex);
		}
		for (let i = 0; i < this.completionlisteners.length; i++) {
			this.completionlisteners[i](newnex);
		}
	}

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
//			'Tab': 'select-first-child-or-fail',
			'Enter': 'do-line-break-always',
			// '~': 'replace-selected-with-command',
			// '!': 'replace-selected-with-bool',
			// '@': 'replace-selected-with-symbol',
			// '#': 'replace-selected-with-integer',
			// '$': 'replace-selected-with-string',
			// '%': 'replace-selected-with-float',
			// '^': 'replace-selected-with-nil',
			// '&': 'replace-selected-with-lambda',
			// '(': 'replace-selected-with-word',
			// '[': 'replace-selected-with-line',
			// '{': 'replace-selected-with-doc',
			// special stuff for expectations that gets rid of the js timeout
			'ShiftBackspace': 'call-delete-handler-then-remove-selected-and-select-previous-sibling',
			'Backspace': 'call-delete-handler-then-remove-selected-and-select-previous-sibling',
		}
	}
}