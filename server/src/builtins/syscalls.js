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

function createSyscalls() {
	// Builtin.createBuiltin(
	// 	'log',
	// 	[
	// 		{name:'nex', type:'*'}
	// 	],
	// 	function(env, argEnv) {
	// 		let n = env.lb('nex');
	// 		console.log(n.debugString());
	// 		return new Nil();
	// 	}
	// );

	Builtin.createBuiltin(
		'apply-style-to',
		[
			{name:'style$', type:'EString'},
			{name:'nex', type:'*'}
		],
		function(env, argEnv) {
			let s = env.lb('style$').getFullTypedValue();
			let n = env.lb('nex');
			n = n.makeCopy();
			n.setCurrentStyle(s);
			return n;
		}
	);

	Builtin.createBuiltin(
		'get-style-from',
		[
			{name:'nex', type:'*'}
		],
		function(env, argEnv) {
			let n = env.lb('nex');
			let s = n.getCurrentStyle();
			return new EString(s);
		}
	);

	Builtin.createBuiltin(
		'get-pixel-width',
		[
			{name:'nex', type:'*'}
		],
		function(env, argEnv) {
			let n = env.lb('nex');
			let rn = new RenderNode(n);
			hiddenroot.appendChild(rn);
			// has to be synchronous so we can measure
			hiddenroot.render(0);
			let w = rn.getDomNode().getBoundingClientRect().width;
			hiddenroot.removeChildAt(0);
			return new Float(w);
		}
	);

	Builtin.createBuiltin(
		'get-pixel-height',
		[
			{name:'nex', type:'*'}
		],
		function(env, argEnv) {
			let n = env.lb('nex');
			let rn = new RenderNode(n);
			hiddenroot.appendChild(rn);
			// has to be synchronous so we can measure
			hiddenroot.render(0);
			let w = rn.getDomNode().getBoundingClientRect().height;
			hiddenroot.removeChildAt(0);
			return new Float(w);
		}
	);


	Builtin.createBuiltin(
		'run-js',
		[
			{name:'expr$', type:'EString'},
			{name:'nex...', type:'*', variadic:true}
		],
		function(env, argEnv) {
			let strn = env.lb('expr$');
			let str = strn.getFullTypedValue();
			let lst = env.lb('nex...');
			var $dom = [];
			var $nex = [];
			var $node = [];
			for (let i = 0; i < lst.numChildren(); i++) {
				let child = lst.getChildAt(i);
				$nex[i] = child;
				if (child.getRenderNodes()) {
					let nodes = child.getRenderNodes();
					$node[i] = nodes[0];
					if ($node[i]) {
						$dom[i] = $node[i].getDomNode();
					}
				} else {
					$dom[i] = child.renderedDomNode;
				}
			}
			let result = eval(str);
			if (typeof result == 'number') {
				if (Math.round(result) == result) {
					return new Integer(result);
				} else {
					return new Float(result);
				}
			} else {
				return new EString(result);
			}
		}
	);
}