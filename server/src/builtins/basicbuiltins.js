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

function createBasicBuiltins() {
	Builtin.createBuiltin(
		'copy',
		[
			{name:'nex', type:'*'}
		],
		function(env, argEnv) {
			return env.lb('nex').makeCopy();
		}
	);


	Builtin.createBuiltin(
		'car',
		[
			{name:'list()', type:'NexContainer'}
		],
		function(env, argEnv) {
			return env.lb('list()').getFirstChild();
		}
	);

	Builtin.createBuiltin(
		'cdr',
		[
			{name:'list()', type:'NexContainer'}
		],
		function(env, argEnv) {
			let c = env.lb('list()');
			if (c.numChildren() == 0) {
				return new EError("cannot cdr an empty list");
			}
			if (LINKEDLIST) {
				let newOne = c.makeCopy(true);
				c.getChildrenForCdr(newOne);
				return newOne;
			} else {
				c = c.makeCopy(true);
				c.removeChild(c.getChildAt(0));
				return c;
			}
		}
	);

	Builtin.createBuiltin(
		'cons',
		[
			{name:'nex', type:'*'},
			{name:'list()', type:'NexContainer'},
		],
		function(env, argEnv) {
			let lst = env.lb('list()');
			let nex = env.lb('nex');
			if (LINKEDLIST) {
				let newOne = lst.makeCopy(true);
				lst.setChildrenForCons(nex, newOne);
				return newOne;
			} else {
				lst = lst.makeCopy(true);
				lst.prependChild(nex);
				return lst;
			}
		}
	);

	Builtin.createBuiltin(
		'chop',
		[
			{name:'list()', type:'NexContainer'}
		],
		function(env, argEnv) {
			let c = env.lb('list()');
			if (c.numChildren() == 0) {
				return new EError("cannot chop an empty list");
			}
			c.removeChild(c.getChildAt(0));
			return c;
		}
	);

	Builtin.createBuiltin(
		'cram',
		[
			{name:'nex', type:'*'},
			{name:'list()', type:'NexContainer'},
		],
		function(env, argEnv) {
			let lst = env.lb('list()');
			lst.prependChild(env.lb('nex'));
			return lst;
		}
	);

	Builtin.createBuiltin(
		'is-empty',
		[
			{name:'list()', type:'NexContainer'},
		],
		function(env, argEnv) {
			let lst = env.lb('list()');
			let rb = !lst.hasChildren();
			return new Bool(rb);
		}
	);

	Builtin.createBuiltin(
		'begin',
		[
			{name:'nex...', type:'*', variadic:true}
		],
		function(env, argEnv) {
			let lst = env.lb('nex...');
			if (lst.numChildren() == 0) {
				return new Nil();
			} else {
				return lst.getChildAt(lst.numChildren() - 1);
			}
		}
	);
	/*

	Builtin.createBuiltin(
		'run',
		[
			{name:'nex', type:'*', skipeval:true}
		],
		function(env, argEnv) {
			let nex = env.lb('nex');

			let exp = new Expectation();
			let result = evaluateNexSafely(nex, argEnv);
			let again = new Command('run');
			again.setVertical();

			if (result.getTypeName() == '-error-') {
				result = wrapError('&szlig;', 'run: error in argument', result);
				exp.appendChild(result);
				again.appendChild(result);
				again.appendChild(nex);
				setTimeout(function() {
					exp.fulfill(again);
				}, 2000);
			} else {
				exp.appendChild(result);
				again.appendChild(nex);
				setTimeout(function() {
					exp.fulfill(again);
				}, 500);
			}
			return exp;
		}
	);
	*/

	Builtin.createBuiltin(
		'let',
		[
			{name:'_name@', type:'ESymbol',skipeval:true},
			{name:'nex', type:'*'}
		],
		function(env, argEnv) {
			let rhs = env.lb('nex');
			argEnv.bind(env.lb('_name@').getTypedValue(), rhs);
			return rhs;
		}
	);

	Builtin.createBuiltin(
		'set',
		[
			{name:'_name@', type:'ESymbol',skipeval:true},
			{name:'nex', type:'*'}
		],
		function(env, argEnv) {
			let rhs = env.lb('nex');
			argEnv.set(env.lb('_name@').getTypedValue(), rhs);
			return rhs;
		}
	);

	Builtin.createBuiltin(
		'bind',
		[
			{name:'_name@', type:'ESymbol',skipeval:true},
			{name:'nex', type:'*'}
		],
		function(env, argEnv) {
			let val = env.lb('nex');
			let name = env.lb('_name@');
			BUILTINS.bindInPackage(name.getTypedValue(), val);
			return name;
		}
	);

	Builtin.createBuiltin(
		'bind-unique',
		[
			{name:'_name@', type:'ESymbol', skipeval:true},
			{name:'nex', type:'*'}
		],
		function(env, argEnv) {
			let val = env.lb('nex');
			BUILTINS.bindUniqueInPackage(env.lb('_name@').getTypedValue(), val);
			return val;
		}
	);

	Builtin.createBuiltin(
		'bound',
		[
		],
		function(env, argEnv) {
			let names = BUILTINS.getAllBoundSymbolsAtThisLevel();
			let r = new Doc();
			for (let i = 0; i < names.length; i++) {
				let sym = new ESymbol(names[i]);
				r.appendChild(sym);
			}
			return r;
		}
	);

	Builtin.createBuiltin(
		'built-ins',
		[
		],
		function(env, argEnv) {
			let names = BUILTINS.getParent().getAllBoundSymbolsAtThisLevel();
			let r = new Doc();
			for (let i = 0; i < names.length; i++) {
				let sym = new ESymbol(names[i]);
				r.appendChild(sym);
			}
			return r;
		}
	);

	// 'eval' is really eval again because args to functions are evaled
	Builtin.createBuiltin(
		'eval',
		[
			{name: 'nex', type:'*'}
		],
		function(env, argEnv) {
			let expr = env.lb('nex');
			let newresult = evaluateNexSafely(expr, argEnv);
			// we do not wrap errors for eval - we let
			// the caller deal with it
			return newresult;				
		}
	);

	Builtin.createBuiltin(
		'convert-type-if-error',
		[
			{name:'errtype$', type:'EString'},
			{name: 'nex', type:'*', skipeval:true}
		],
		function(env, argEnv) {
			let expr = env.lb('nex');
			let newresult = evaluateNexSafely(expr, argEnv);
			if (newresult.getTypeName() != '-error-') {
				// you might think this function would throw an
				// error if you tried to pass it something that's
				// not an error, but the problem with doing that
				// is that you can't test for whether something is
				// an error WITHOUT using this function. So non-errors
				// are passed unchanged.
				return newresult;
			}

			let etstring = env.lb('errtype$').getFullTypedValue();
			let errtype = ERROR_TYPE_FATAL;
			switch(etstring) {
				case "warn":
					errtype = ERROR_TYPE_WARN;
					break;
				case "info":
					errtype = ERROR_TYPE_INFO;
					break;
				case "fatal":
					break;
				default:
					throw new EError("set-error-type: invalid error type string (valid strings are 'info', 'warn', and 'fatal'");
			}

			newresult.setErrorType(errtype);
			return newresult;
		}
	);	

	Builtin.createBuiltin(
		'quote',
		[
			{name: 'nex', type:'*', skipeval:true}
		],
		function(env, argEnv) {
			return env.lb('nex');
		}
	);

	Builtin.createBuiltin(
		'jslog',
		[
			{name: 'nex', type:'*'}
		],
		function(env, argEnv) {
			let nex = env.lb('nex');
			console.log(nex.debugString());
			return nex;
		})

	Builtin.createBuiltin(
		'eq',
		[
			{name: 'lhs', type:'*'},
			{name: 'rhs', type:'*'}
		],
		function(env, argEnv) {
			let lhs = env.lb('lhs');
			let rhs = env.lb('rhs');
			return new Bool(rhs.getID() == lhs.getID());
		}
	);

	Builtin.createBuiltin(
		'equal',
		[
			{name: 'lhs', type:'*'},
			{name: 'rhs', type:'*'}
		],
		function(env, argEnv) {
			let lhs = env.lb('lhs');
			let rhs = env.lb('rhs');
			if (lhs instanceof Bool && rhs instanceof Bool) {
				return new Bool(lhs.getTypedValue() == rhs.getTypedValue());
			} else if (lhs instanceof Builtin && rhs instanceof Builtin) {
				return new Bool(lhs.getID() == rhs.getID());
			} else if (lhs instanceof EString && rhs instanceof EString) {
				return new Bool(lhs.getFullTypedValue() == rhs.getFullTypedValue());
			} else if (lhs instanceof ESymbol && rhs instanceof ESymbol) {
				return new Bool(lhs.getTypedValue() == rhs.getTypedValue());
			} else if (lhs instanceof Float && rhs instanceof Float) {
				return new Bool(lhs.getTypedValue() == rhs.getTypedValue());
			} else if (lhs instanceof Integer && rhs instanceof Integer) {
				return new Bool(lhs.getTypedValue() == rhs.getTypedValue());
			} else if (lhs instanceof Letter && rhs instanceof Letter) {
				return new Bool(lhs.getText() == rhs.getText());
			} else if (lhs instanceof Separator && rhs instanceof Separator) {
				return new Bool(lhs.getText() == rhs.getText());
			} else if (lhs instanceof Nil && rhs instanceof Nil) {
				return new Bool(true);


			} else if (lhs instanceof Command && rhs instanceof Command) {
				return new EError('equal for lists is not implemented')
			} else if (lhs instanceof Lambda && rhs instanceof Lambda) {
				return new EError('equal for lists is not implemented')
			} else if (lhs instanceof Doc && rhs instanceof Doc) {
				return new EError('equal for lists is not implemented')
			} else if (lhs instanceof Line && rhs instanceof Line) {
				return new EError('equal for lists is not implemented')
			} else if (lhs instanceof Word && rhs instanceof Word) {
				return new EError('equal for lists is not implemented')
			} else if (lhs instanceof Zlist && rhs instanceof Zlist) {
				return new EError('equal for lists is not implemented')
			} else if (lhs instanceof Expectation && rhs instanceof Expectation) {
				return new EError('equal for lists is not implemented')
			} else {
				return new Bool(false);
			}
		}
	);
}