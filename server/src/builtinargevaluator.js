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

/*

ways you can do args:
1. A A A V
a set of required args then a variadic (could be zero A's)
1. A A A O O
a set of required args then some optional ones (could be zero A's)

variadics are packaged up inside a list of some type (maybe a word)
*/

// TODO: get rid of the arg container class and use BuiltinParamManager inside the arg evaluator

class BuiltinParamManager {
	constructor(params, args) {
		this.params = params;
		this.args = args;
		this.effectiveParams = [];
	}

	reconcile() {
		this.verifyParameterCorrectness();
		this.checkNumArgs();
		this.padEffectiveParams();
	}

	verifyParameterCorrectness() {
		this.hasoptionals = false;
		this.hasvariadics = false;
		this.numRequiredParams = 0;
		for (let i = 0; i < this.params.length; i++) {
			let param = this.params[i];
			if (param.optional) {
				if (this.hasvariadics) {
					throw new Error("can't have variadics and also optionals.");
				}
				this.hasoptionals = true;
				continue;
			}
			if (param.variadic) {
				if (this.hasoptionals) {
					throw new Error("can't have variadics and also optionals.");
				}
				if (this.hasvariadics) {
					throw new Error("can't have multiple variadics");
				}
				this.hasvariadics = true;
				continue;
			}
			this.numRequiredParams++;
		}
	}

	checkNumArgs() {
		if (this.args.length < this.numRequiredParams) {
			throw new EError(this.name + ": not enough args passed to function.");
		}
	}

	padEffectiveParams() {
		let i = 0;
		for (; i < this.params.length; i++) {
			this.effectiveParams[i] = this.params[i];
		}
		if (this.hasvariadics) {
			for(let lasti = i - 1; i < this.args.length; i++) {
				this.effectiveParams[i] = this.params[lasti];
			}
		}
	}
}


class BuiltinArgEvaluator {
	constructor(name, params, argContainer, env, bindEnv) {
		this.name = name;
		this.params = params;
		this.argContainer = argContainer;
		this.env = env;
		this.bindEnv = bindEnv;
//		this.paramManager = new BuiltinParamManager(params, argContainer);
		this.verifyParameterCorrectness();
	}

	verifyParameterCorrectness() {
		this.hasoptionals = false;
		this.hasvariadics = false;
		this.numRequiredParams = 0;
		for (let i = 0; i < this.params.length; i++) {
			let param = this.params[i];
			if (param.optional) {
				if (this.hasvariadics) {
					throw new Error("can't have variadics and also optionals.");
				}
				this.hasoptionals = true;
				continue;
			}
			if (param.variadic) {
				if (this.hasoptionals) {
					throw new Error("can't have variadics and also optionals.");
				}
				if (this.hasvariadics) {
					throw new Error("can't have multiple variadics");
				}
				this.hasvariadics = true;
				continue;
			}
			this.numRequiredParams++;
		}
	}

	checkMinNumArgs() {
		if (this.argContainer.numArgs() < this.numRequiredParams) {
			throw new EError(this.name + ": not enough args passed to function.");
		}
	}

	checkMaxNumArgs() {
		if (this.argContainer.numArgs() > this.effectiveParams.length) {
			throw new EError(this.name + ": too many args passed to function")
		}
	}

	padEffectiveParams() {
		this.effectiveParams = [];
		let i = 0;
		for (; i < this.params.length; i++) {
			this.effectiveParams[i] = this.params[i];
		}
		if (this.hasvariadics) {
			for(let lasti = i - 1; i < this.argContainer.numArgs(); i++) {
				this.effectiveParams[i] = this.params[lasti];
			}
		}
	}

	processSingleArg(i) {
		let param = this.effectiveParams[i];
		let arg = this.argContainer.getArgAt(i);
		if (!param.skipeval) {
			arg = evaluateNexSafely(arg, this.env);
			if (arg.getTypeName() == '-error-') {
				throw wrapError('&szlig;', this.name + ": error in argument " + (i+1), arg);
			}
		}
		let typeChecksOut = BuiltinArgEvaluator.ARG_VALIDATORS[param.type](arg);

		if (!typeChecksOut) {
			if (arg instanceof EError) {
				throw wrapError('&szlig;', this.name + ": expects a " + param.type + " for argument " + (i+1) + " but got error (enclosed)", arg);
			} else {
				throw new EError(this.name + ": expects a " + param.type + " for argument " + (i+1) + " but got " + arg.getTypeName());
			}
		}
		this.argContainer.setArgAt(arg, i);
	}

	processArgs() {
		for (let i = 0; i < this.argContainer.numArgs(); i++) {
			this.processSingleArg(i);
		}
	}

	bindArgs() {
		for (let i = 0; i < this.params.length; i++) {
			let param = this.params[i];
			if (param.variadic) {
				let w = new Word();
				for (let j = i; j < this.argContainer.numArgs(); j++) {
					if (RENDERNODES) {
						w.appendChild(this.argContainer.getArgAt(j));
					} else {
						w.appendChild(this.argContainer.getArgAt(j).makeCopy());
					}
				}
				this.bindEnv.bind(param.name, w);
			} else if (param.optional) {
				if (i < this.argContainer.numArgs()) {
					this.bindEnv.bind(param.name, this.argContainer.getArgAt(i));
				}
			} else {
				this.bindEnv.bind(param.name, this.argContainer.getArgAt(i));
			}
		}
	}

	evaluateAndBindArgs() {
		this.checkMinNumArgs();
		this.padEffectiveParams();
		this.checkMaxNumArgs();
		this.processArgs();
		this.bindArgs();
	}
}


BuiltinArgEvaluator.ARG_VALIDATORS = {
	'*': arg => true,
	'NexContainer': arg => (arg instanceof NexContainer),
	'Bool': arg => (arg.getTypeName() == '-bool-'),
	'Command': arg => (arg.getTypeName() == '-command-'),
	'Expectation': arg => (arg.getTypeName() == '-expectation-'),
	'Doc': arg => (arg.getTypeName() == '-doc-'),
	'EString': arg => (arg.getTypeName() == '-string-'),
	'ESymbol': arg => (arg.getTypeName() == '-symbol-'),
	'Float': arg => (arg.getTypeName() == '-float-'),
	'Number': arg => (arg.getTypeName() == '-integer-' || arg.getTypeName() == '-float-'),
	'Integer': arg => (arg.getTypeName() == '-integer-'),
	'Letter': arg => (arg.getTypeName() == '-letter-'),
	'Line': arg => (arg.getTypeName() == '-line-'),
	'Nil': arg => (arg.getTypeName() == '-nil-'),
	'Word': arg => (arg.getTypeName() == '-word-'),
	'Lambda': arg => (arg.getTypeName() == '-lambda-'),
};
