(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ShareButtonsComponent = {}));
}(this, (function (exports) { 'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* src\ShareButton.svelte generated by Svelte v3.37.0 */

    function add_css$c() {
    	var style = element("style");
    	style.id = "svelte-d50i8r-style";
    	style.textContent = ".ssbc-button__link.svelte-d50i8r,.ssbc-button__icon.svelte-d50i8r{display:flex}.ssbc-button__link.svelte-d50i8r{padding:0.9em 1.15em;text-decoration:none;color:#fff}.ssbc-button.svelte-d50i8r{transition:25ms ease-out;padding:0.75em}.ssbc-button__icon.svelte-d50i8r svg{width:1em;height:1em;margin:0;vertical-align:middle}.ssbc-button__icon--fill.svelte-d50i8r{fill:#fff;stroke:none}.ssbc-button__icon--outline.svelte-d50i8r{fill:none;stroke:#fff}";
    	append(document.head, style);
    }

    function create_fragment$c(ctx) {
    	let a;
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let div1_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	return {
    		c() {
    			a = element("a");
    			div1 = element("div");
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			t1 = text(/*label*/ ctx[1]);
    			attr(div0, "aria-hidden", "true");
    			attr(div0, "class", "ssbc-button__icon svelte-d50i8r");
    			toggle_class(div0, "ssbc-button__icon--fill", /*fill*/ ctx[2]);
    			toggle_class(div0, "ssbc-button__icon--outline", !/*fill*/ ctx[2]);
    			attr(div1, "class", div1_class_value = "ssbc-button " + /*classes*/ ctx[4] + " svelte-d50i8r");
    			attr(a, "class", "ssbc-button__link svelte-d50i8r");
    			attr(a, "href", /*href*/ ctx[0]);
    			attr(a, "target", "_blank");
    			attr(a, "rel", "noopener");
    			attr(a, "aria-label", /*ariaLabel*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, div1);
    			append(div1, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			append(div1, t0);
    			append(div1, t1);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 32) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
    				}
    			}

    			if (dirty & /*fill*/ 4) {
    				toggle_class(div0, "ssbc-button__icon--fill", /*fill*/ ctx[2]);
    			}

    			if (dirty & /*fill*/ 4) {
    				toggle_class(div0, "ssbc-button__icon--outline", !/*fill*/ ctx[2]);
    			}

    			if (!current || dirty & /*label*/ 2) set_data(t1, /*label*/ ctx[1]);

    			if (!current || dirty & /*classes*/ 16 && div1_class_value !== (div1_class_value = "ssbc-button " + /*classes*/ ctx[4] + " svelte-d50i8r")) {
    				attr(div1, "class", div1_class_value);
    			}

    			if (!current || dirty & /*href*/ 1) {
    				attr(a, "href", /*href*/ ctx[0]);
    			}

    			if (!current || dirty & /*ariaLabel*/ 8) {
    				attr(a, "aria-label", /*ariaLabel*/ ctx[3]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { href } = $$props;
    	let { label = "" } = $$props;
    	let { fill = true } = $$props;
    	let { ariaLabel = "" } = $$props;
    	let { class: classes = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("fill" in $$props) $$invalidate(2, fill = $$props.fill);
    		if ("ariaLabel" in $$props) $$invalidate(3, ariaLabel = $$props.ariaLabel);
    		if ("class" in $$props) $$invalidate(4, classes = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	return [href, label, fill, ariaLabel, classes, $$scope, slots];
    }

    class ShareButton extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-d50i8r-style")) add_css$c();

    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
    			href: 0,
    			label: 1,
    			fill: 2,
    			ariaLabel: 3,
    			class: 4
    		});
    	}
    }

    /* src\Email.svelte generated by Svelte v3.37.0 */

    function add_css$b() {
    	var style = element("style");
    	style.id = "svelte-3e9xyf-style";
    	style.textContent = ".ssbc-button--email{background-color:#777777}.ssbc-button--email:active,.ssbc-button--email:hover{background-color:#5e5e5e}";
    	append(document.head, style);
    }

    // (26:0) <ShareButton class="ssbc-button--email {classes}" {...$$restProps} {ariaLabel} {href}>
    function create_default_slot$b(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", "M22 4H2C.9 4 0 4.9 0 6v12c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM7.25 14.43l-3.5 2c-.08.05-.17.07-.25.07-.17 0-.34-.1-.43-.25-.14-.24-.06-.55.18-.68l3.5-2c.24-.14.55-.06.68.18.14.24.06.55-.18.68zm4.75.07c-.1 0-.2-.03-.27-.08l-8.5-5.5c-.23-.15-.3-.46-.15-.7.15-.22.46-.3.7-.14L12 13.4l8.23-5.32c.23-.15.54-.08.7.15.14.23.07.54-.16.7l-8.5 5.5c-.08.04-.17.07-.27.07zm8.93 1.75c-.1.16-.26.25-.43.25-.08 0-.17-.02-.25-.07l-3.5-2c-.24-.13-.32-.44-.18-.68s.44-.32.68-.18l3.5 2c.24.13.32.44.18.68z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--email " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot$b] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--email " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 64) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	const omit_props_names = ["subject","body","ariaLabel","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { subject } = $$props;
    	let { body } = $$props;
    	let { ariaLabel = "Share by Email" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("subject" in $$new_props) $$invalidate(4, subject = $$new_props.subject);
    		if ("body" in $$new_props) $$invalidate(5, body = $$new_props.body);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*subject, body*/ 48) {
    			$$invalidate(2, href = encodeURI(`mailto:?subject=${subject}&body=${body}`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, subject, body];
    }

    class Email extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-3e9xyf-style")) add_css$b();

    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {
    			subject: 4,
    			body: 5,
    			ariaLabel: 0,
    			class: 1
    		});
    	}
    }

    /* src\Facebook.svelte generated by Svelte v3.37.0 */

    function add_css$a() {
    	var style = element("style");
    	style.id = "svelte-15d9e9c-style";
    	style.textContent = ".ssbc-button--facebook{background-color:#3b5998}.ssbc-button--facebook:active,.ssbc-button--facebook:hover{background-color:#2d4373}";
    	append(document.head, style);
    }

    // (25:0) <ShareButton class="ssbc-button--facebook {classes}" {...$$restProps} {ariaLabel} {href}>
    function create_default_slot$a(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", "M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$a(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--facebook " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot$a] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--facebook " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 32) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	const omit_props_names = ["url","ariaLabel","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { url } = $$props;
    	let { ariaLabel = "Share on Facebook" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("url" in $$new_props) $$invalidate(4, url = $$new_props.url);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*url*/ 16) {
    			$$invalidate(2, href = encodeURI(`https://facebook.com/sharer/sharer.php?u=${url}`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, url];
    }

    class Facebook extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-15d9e9c-style")) add_css$a();
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { url: 4, ariaLabel: 0, class: 1 });
    	}
    }

    /* src\HackerNews.svelte generated by Svelte v3.37.0 */

    function add_css$9() {
    	var style = element("style");
    	style.id = "svelte-15xrllp-style";
    	style.textContent = ".ssbc-button--hacker-news{background-color:#FF6600}.ssbc-button--hacker-news:active,.ssbc-button--hacker-news:hover{background-color:#FB6200}";
    	append(document.head, style);
    }

    // (26:0) <ShareButton class="ssbc-button--hacker-news {classes}" {...$$restProps} {ariaLabel} {href}>
    function create_default_slot$9(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "fill-rule", "evenodd");
    			attr(path, "d", "M60.94 82.314L17 0h20.08l25.85 52.093c.397.927.86 1.888 1.39 2.883.53.994.995 2.02 1.393 3.08.265.4.463.764.596 1.095.13.334.262.63.395.898.662 1.325 1.26 2.618 1.79 3.877.53 1.26.993 2.42 1.39 3.48 1.06-2.254 2.22-4.673 3.48-7.258 1.26-2.585 2.552-5.27 3.877-8.052L103.49 0h18.69L77.84 83.308v53.087h-16.9v-54.08z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 140 140");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--hacker-news " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot$9] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--hacker-news " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 64) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	const omit_props_names = ["title","url","ariaLabel","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { title } = $$props;
    	let { url } = $$props;
    	let { ariaLabel = "Share on HackerNews" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("title" in $$new_props) $$invalidate(4, title = $$new_props.title);
    		if ("url" in $$new_props) $$invalidate(5, url = $$new_props.url);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*url, title*/ 48) {
    			$$invalidate(2, href = encodeURI(`https://news.ycombinator.com/submitlink?u=${url}&t=${title}`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, title, url];
    }

    class HackerNews extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-15xrllp-style")) add_css$9();
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { title: 4, url: 5, ariaLabel: 0, class: 1 });
    	}
    }

    /* src\LinkedIn.svelte generated by Svelte v3.37.0 */

    function add_css$8() {
    	var style = element("style");
    	style.id = "svelte-163tckm-style";
    	style.textContent = ".ssbc-button--linkedin{background-color:#0077b5}.ssbc-button--linkedin:active,.ssbc-button--linkedin:hover{background-color:#046293}";
    	append(document.head, style);
    }

    // (25:0) <ShareButton class="ssbc-button--linkedin {classes}" {...$$restProps} {ariaLabel} {href}>
    function create_default_slot$8(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", "M6.5 21.5h-5v-13h5v13zM4 6.5C2.5 6.5 1.5 5.3 1.5 4s1-2.4 2.5-2.4c1.6 0 2.5 1 2.6 2.5 0 1.4-1 2.5-2.6 2.5zm11.5 6c-1 0-2 1-2 2v7h-5v-13h5V10s1.6-1.5 4-1.5c3 0 5 2.2 5 6.3v6.7h-5v-7c0-1-1-2-2-2z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--linkedin " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot$8] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--linkedin " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 32) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	const omit_props_names = ["url","ariaLabel","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { url } = $$props;
    	let { ariaLabel = "Share on LinkedIn" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("url" in $$new_props) $$invalidate(4, url = $$new_props.url);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*url*/ 16) {
    			$$invalidate(2, href = encodeURI(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, url];
    }

    class LinkedIn extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-163tckm-style")) add_css$8();
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { url: 4, ariaLabel: 0, class: 1 });
    	}
    }

    /* src\Pinterest.svelte generated by Svelte v3.37.0 */

    function add_css$7() {
    	var style = element("style");
    	style.id = "svelte-tgy9sk-style";
    	style.textContent = ".ssbc-button--pinterest{background-color:#bd081c}.ssbc-button--pinterest:active,.ssbc-button--pinterest:hover{background-color:#8c0615}";
    	append(document.head, style);
    }

    // (27:0) <ShareButton class="ssbc-button--pinterest {classes}" {...$$restProps} {ariaLabel} {href}>
    function create_default_slot$7(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", "M12.14.5C5.86.5 2.7 5 2.7 8.75c0 2.27.86 4.3 2.7 5.05.3.12.57 0 .66-.33l.27-1.06c.1-.32.06-.44-.2-.73-.52-.62-.86-1.44-.86-2.6 0-3.33 2.5-6.32 6.5-6.32 3.55 0 5.5 2.17 5.5 5.07 0 3.8-1.7 7.02-4.2 7.02-1.37 0-2.4-1.14-2.07-2.54.4-1.68 1.16-3.48 1.16-4.7 0-1.07-.58-1.98-1.78-1.98-1.4 0-2.55 1.47-2.55 3.42 0 1.25.43 2.1.43 2.1l-1.7 7.2c-.5 2.13-.08 4.75-.04 5 .02.17.22.2.3.1.14-.18 1.82-2.26 2.4-4.33.16-.58.93-3.63.93-3.63.45.88 1.8 1.65 3.22 1.65 4.25 0 7.13-3.87 7.13-9.05C20.5 4.15 17.18.5 12.14.5z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--pinterest " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot$7] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--pinterest " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 128) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	const omit_props_names = ["description","url","media","ariaLabel","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { description } = $$props;
    	let { url } = $$props;
    	let { media } = $$props;
    	let { ariaLabel = "Share on Pinterest" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("description" in $$new_props) $$invalidate(4, description = $$new_props.description);
    		if ("url" in $$new_props) $$invalidate(5, url = $$new_props.url);
    		if ("media" in $$new_props) $$invalidate(6, media = $$new_props.media);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*url, media, description*/ 112) {
    			$$invalidate(2, href = encodeURI(`https://pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${description}`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, description, url, media];
    }

    class Pinterest extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-tgy9sk-style")) add_css$7();

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			description: 4,
    			url: 5,
    			media: 6,
    			ariaLabel: 0,
    			class: 1
    		});
    	}
    }

    /* src\Reddit.svelte generated by Svelte v3.37.0 */

    function add_css$6() {
    	var style = element("style");
    	style.id = "svelte-1trhwhz-style";
    	style.textContent = ".ssbc-button--reddit{background-color:#5f99cf}.ssbc-button--reddit:active,.ssbc-button--reddit:hover{background-color:#3a80c1}";
    	append(document.head, style);
    }

    // (26:0) <ShareButton class="ssbc-button--reddit {classes}" {...$$restProps} {ariaLabel} {href}>
    function create_default_slot$6(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", "M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.75-1.64-6.07-1.72.08-1.1.4-3.05 1.52-3.7.72-.4 1.73-.24 3 .5C17.2 6.3 18.46 7.5 20 7.5c1.65 0 3-1.35 3-3s-1.35-3-3-3c-1.38 0-2.54.94-2.88 2.22-1.43-.72-2.64-.8-3.6-.25-1.64.94-1.95 3.47-2 4.55-2.33.08-4.45.7-6.1 1.72C4.86 8.98 3.96 8.5 3 8.5c-1.65 0-3 1.35-3 3 0 1.32.84 2.44 2.05 2.84-.03.22-.05.44-.05.66 0 3.86 4.5 7 10 7s10-3.14 10-7c0-.22-.02-.44-.05-.66 1.2-.4 2.05-1.54 2.05-2.84zM2.3 13.37C1.5 13.07 1 12.35 1 11.5c0-1.1.9-2 2-2 .64 0 1.22.32 1.6.82-1.1.85-1.92 1.9-2.3 3.05zm3.7.13c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9.8 4.8c-1.08.63-2.42.96-3.8.96-1.4 0-2.74-.34-3.8-.95-.24-.13-.32-.44-.2-.68.15-.24.46-.32.7-.18 1.83 1.06 4.76 1.06 6.6 0 .23-.13.53-.05.67.2.14.23.06.54-.18.67zm.2-2.8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm5.7-2.13c-.38-1.16-1.2-2.2-2.3-3.05.38-.5.97-.82 1.6-.82 1.1 0 2 .9 2 2 0 .84-.53 1.57-1.3 1.87z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--reddit " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot$6] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--reddit " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 64) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	const omit_props_names = ["title","url","ariaLabel","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { title } = $$props;
    	let { url } = $$props;
    	let { ariaLabel = "Share on Reddit" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("title" in $$new_props) $$invalidate(4, title = $$new_props.title);
    		if ("url" in $$new_props) $$invalidate(5, url = $$new_props.url);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*url, title*/ 48) {
    			$$invalidate(2, href = encodeURI(`https://reddit.com/submit/?url=${url}&resubmit=true&title=${title}`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, title, url];
    }

    class Reddit extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1trhwhz-style")) add_css$6();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { title: 4, url: 5, ariaLabel: 0, class: 1 });
    	}
    }

    /* src\Telegram.svelte generated by Svelte v3.37.0 */

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-1qms23-style";
    	style.textContent = ".ssbc-button--telegram{background-color:#54A9EB}.ssbc-button--telegram:active,.ssbc-button--telegram:hover{background-color:#4B97D1}";
    	append(document.head, style);
    }

    // (26:0) <ShareButton class="ssbc-button--telegram {classes}" {...$$restProps} {ariaLabel} {href}>
    function create_default_slot$5(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", "M.707 8.475C.275 8.64 0 9.508 0 9.508s.284.867.718 1.03l5.09 1.897 1.986 6.38a1.102 1.102 0 0 0 1.75.527l2.96-2.41a.405.405 0 0 1 .494-.013l5.34 3.87a1.1 1.1 0 0 0 1.046.135 1.1 1.1 0 0 0 .682-.803l3.91-18.795A1.102 1.102 0 0 0 22.5.075L.706 8.475z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--telegram " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot$5] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--telegram " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 64) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	const omit_props_names = ["text","url","ariaLabel","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { text } = $$props;
    	let { url } = $$props;
    	let { ariaLabel = "Share on Telegram" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("text" in $$new_props) $$invalidate(4, text = $$new_props.text);
    		if ("url" in $$new_props) $$invalidate(5, url = $$new_props.url);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*text, url*/ 48) {
    			$$invalidate(2, href = encodeURI(`https://telegram.me/share/url?text=${text}&url=${url}`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, text, url];
    }

    class Telegram extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1qms23-style")) add_css$5();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { text: 4, url: 5, ariaLabel: 0, class: 1 });
    	}
    }

    /* src\Tumblr.svelte generated by Svelte v3.37.0 */

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-x1za0j-style";
    	style.textContent = ".ssbc-button--tumblr{background-color:#35465C}.ssbc-button--tumblr:active,.ssbc-button--tumblr:hover{background-color:#222d3c}";
    	append(document.head, style);
    }

    // (27:0) <ShareButton class="ssbc-button--tumblr {classes}" {...$$restProps} {ariaLabel} {href}>
    function create_default_slot$4(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", "M13.5.5v5h5v4h-5V15c0 5 3.5 4.4 6 2.8v4.4c-6.7 3.2-12 0-12-4.2V9.5h-3V6.7c1-.3 2.2-.7 3-1.3.5-.5 1-1.2 1.4-2 .3-.7.6-1.7.7-3h3.8z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--tumblr " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot$4] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--tumblr " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 128) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const omit_props_names = ["title","caption","url","ariaLabel","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { title } = $$props;
    	let { caption } = $$props;
    	let { url } = $$props;
    	let { ariaLabel = "Share on Tumblr" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("title" in $$new_props) $$invalidate(4, title = $$new_props.title);
    		if ("caption" in $$new_props) $$invalidate(5, caption = $$new_props.caption);
    		if ("url" in $$new_props) $$invalidate(6, url = $$new_props.url);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*title, caption, url*/ 112) {
    			$$invalidate(2, href = encodeURI(`https://www.tumblr.com/widgets/share/tool?posttype=link&title=${title}&caption=${caption}&content=${url}&canonicalUrl=${url}&shareSource=tumblr_share_button`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, title, caption, url];
    }

    class Tumblr extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-x1za0j-style")) add_css$4();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			title: 4,
    			caption: 5,
    			url: 6,
    			ariaLabel: 0,
    			class: 1
    		});
    	}
    }

    /* src\Twitter.svelte generated by Svelte v3.37.0 */

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-hfnfez-style";
    	style.textContent = ".ssbc-button--twitter{background-color:#55acee}.ssbc-button--twitter:active,.ssbc-button--twitter:hover{background-color:#2795e9}";
    	append(document.head, style);
    }

    // (29:0) <ShareButton class="ssbc-button--twitter {classes}" {...$$restProps} {ariaLabel} {href}>
    function create_default_slot$3(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", "M23.44 4.83c-.8.37-1.5.38-2.22.02.93-.56.98-.96 1.32-2.02-.88.52-1.86.9-2.9 1.1-.82-.88-2-1.43-3.3-1.43-2.5 0-4.55 2.04-4.55 4.54 0 .36.03.7.1 1.04-3.77-.2-7.12-2-9.36-4.75-.4.67-.6 1.45-.6 2.3 0 1.56.8 2.95 2 3.77-.74-.03-1.44-.23-2.05-.57v.06c0 2.2 1.56 4.03 3.64 4.44-.67.2-1.37.2-2.06.08.58 1.8 2.26 3.12 4.25 3.16C5.78 18.1 3.37 18.74 1 18.46c2 1.3 4.4 2.04 6.97 2.04 8.35 0 12.92-6.92 12.92-12.93 0-.2 0-.4-.02-.6.9-.63 1.96-1.22 2.56-2.14z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--twitter " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot$3] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--twitter " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 512) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	const omit_props_names = ["text","url","ariaLabel","hashtags","via","related","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { text } = $$props;
    	let { url } = $$props;
    	let { ariaLabel = "Share on Twitter" } = $$props;
    	let { hashtags = "" } = $$props;
    	let { via = "" } = $$props;
    	let { related = "" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("text" in $$new_props) $$invalidate(4, text = $$new_props.text);
    		if ("url" in $$new_props) $$invalidate(5, url = $$new_props.url);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("hashtags" in $$new_props) $$invalidate(6, hashtags = $$new_props.hashtags);
    		if ("via" in $$new_props) $$invalidate(7, via = $$new_props.via);
    		if ("related" in $$new_props) $$invalidate(8, related = $$new_props.related);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*text, hashtags, via, related, url*/ 496) {
    			$$invalidate(2, href = encodeURI(`https://twitter.com/intent/tweet/?text=${text}&hashtags=${hashtags}&via=${via}&related=${related}&url=${url}`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, text, url, hashtags, via, related];
    }

    class Twitter extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-hfnfez-style")) add_css$3();

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			text: 4,
    			url: 5,
    			ariaLabel: 0,
    			hashtags: 6,
    			via: 7,
    			related: 8,
    			class: 1
    		});
    	}
    }

    /* src\Vk.svelte generated by Svelte v3.37.0 */

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-he0kdi-style";
    	style.textContent = ".ssbc-button--vk{background-color:#507299}.ssbc-button--vk:active,.ssbc-button--vk:hover{background-color:#43648c}";
    	append(document.head, style);
    }

    // (26:0) <ShareButton class="ssbc-button--vk {classes}" {...$$restProps} {ariaLabel} {href}>
    function create_default_slot$2(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", "M21.547 7h-3.29a.743.743 0 0 0-.655.392s-1.312 2.416-1.734 3.23C14.734 12.813 14 12.126 14 11.11V7.603A1.104 1.104 0 0 0 12.896 6.5h-2.474a1.982 1.982 0 0 0-1.75.813s1.255-.204 1.255 1.49c0 .42.022 1.626.04 2.64a.73.73 0 0 1-1.272.503 21.54 21.54 0 0 1-2.498-4.543.693.693 0 0 0-.63-.403h-2.99a.508.508 0 0 0-.48.685C3.005 10.175 6.918 18 11.38 18h1.878a.742.742 0 0 0 .742-.742v-1.135a.73.73 0 0 1 1.23-.53l2.247 2.112a1.09 1.09 0 0 0 .746.295h2.953c1.424 0 1.424-.988.647-1.753-.546-.538-2.518-2.617-2.518-2.617a1.02 1.02 0 0 1-.078-1.323c.637-.84 1.68-2.212 2.122-2.8.603-.804 1.697-2.507.197-2.507z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--vk " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--vk " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 64) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	const omit_props_names = ["title","url","ariaLabel","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { title } = $$props;
    	let { url } = $$props;
    	let { ariaLabel = "Share on VK" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("title" in $$new_props) $$invalidate(4, title = $$new_props.title);
    		if ("url" in $$new_props) $$invalidate(5, url = $$new_props.url);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*title, url*/ 48) {
    			$$invalidate(2, href = encodeURI(`http://vk.com/share.php?title=${title}&url=${url}`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, title, url];
    }

    class Vk extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-he0kdi-style")) add_css$2();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { title: 4, url: 5, ariaLabel: 0, class: 1 });
    	}
    }

    var appleIphone = /iPhone/i;
    var appleIpod = /iPod/i;
    var appleTablet = /iPad/i;
    var appleUniversal = /\biOS-universal(?:.+)Mac\b/i;
    var androidPhone = /\bAndroid(?:.+)Mobile\b/i;
    var androidTablet = /Android/i;
    var amazonPhone = /(?:SD4930UR|\bSilk(?:.+)Mobile\b)/i;
    var amazonTablet = /Silk/i;
    var windowsPhone = /Windows Phone/i;
    var windowsTablet = /\bWindows(?:.+)ARM\b/i;
    var otherBlackBerry = /BlackBerry/i;
    var otherBlackBerry10 = /BB10/i;
    var otherOpera = /Opera Mini/i;
    var otherChrome = /\b(CriOS|Chrome)(?:.+)Mobile/i;
    var otherFirefox = /Mobile(?:.+)Firefox\b/i;
    var isAppleTabletOnIos13 = function (navigator) {
        return (typeof navigator !== 'undefined' &&
            navigator.platform === 'MacIntel' &&
            typeof navigator.maxTouchPoints === 'number' &&
            navigator.maxTouchPoints > 1 &&
            typeof MSStream === 'undefined');
    };
    function createMatch(userAgent) {
        return function (regex) { return regex.test(userAgent); };
    }
    function isMobile(param) {
        var nav = {
            userAgent: '',
            platform: '',
            maxTouchPoints: 0
        };
        if (!param && typeof navigator !== 'undefined') {
            nav = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                maxTouchPoints: navigator.maxTouchPoints || 0
            };
        }
        else if (typeof param === 'string') {
            nav.userAgent = param;
        }
        else if (param && param.userAgent) {
            nav = {
                userAgent: param.userAgent,
                platform: param.platform,
                maxTouchPoints: param.maxTouchPoints || 0
            };
        }
        var userAgent = nav.userAgent;
        var tmp = userAgent.split('[FBAN');
        if (typeof tmp[1] !== 'undefined') {
            userAgent = tmp[0];
        }
        tmp = userAgent.split('Twitter');
        if (typeof tmp[1] !== 'undefined') {
            userAgent = tmp[0];
        }
        var match = createMatch(userAgent);
        var result = {
            apple: {
                phone: match(appleIphone) && !match(windowsPhone),
                ipod: match(appleIpod),
                tablet: !match(appleIphone) &&
                    (match(appleTablet) || isAppleTabletOnIos13(nav)) &&
                    !match(windowsPhone),
                universal: match(appleUniversal),
                device: (match(appleIphone) ||
                    match(appleIpod) ||
                    match(appleTablet) ||
                    match(appleUniversal) ||
                    isAppleTabletOnIos13(nav)) &&
                    !match(windowsPhone)
            },
            amazon: {
                phone: match(amazonPhone),
                tablet: !match(amazonPhone) && match(amazonTablet),
                device: match(amazonPhone) || match(amazonTablet)
            },
            android: {
                phone: (!match(windowsPhone) && match(amazonPhone)) ||
                    (!match(windowsPhone) && match(androidPhone)),
                tablet: !match(windowsPhone) &&
                    !match(amazonPhone) &&
                    !match(androidPhone) &&
                    (match(amazonTablet) || match(androidTablet)),
                device: (!match(windowsPhone) &&
                    (match(amazonPhone) ||
                        match(amazonTablet) ||
                        match(androidPhone) ||
                        match(androidTablet))) ||
                    match(/\bokhttp\b/i)
            },
            windows: {
                phone: match(windowsPhone),
                tablet: match(windowsTablet),
                device: match(windowsPhone) || match(windowsTablet)
            },
            other: {
                blackberry: match(otherBlackBerry),
                blackberry10: match(otherBlackBerry10),
                opera: match(otherOpera),
                firefox: match(otherFirefox),
                chrome: match(otherChrome),
                device: match(otherBlackBerry) ||
                    match(otherBlackBerry10) ||
                    match(otherOpera) ||
                    match(otherFirefox) ||
                    match(otherChrome)
            },
            any: false,
            phone: false,
            tablet: false
        };
        result.any =
            result.apple.device ||
                result.android.device ||
                result.windows.device ||
                result.other.device;
        result.phone =
            result.apple.phone || result.android.phone || result.windows.phone;
        result.tablet =
            result.apple.tablet || result.android.tablet || result.windows.tablet;
        return result;
    }

    /* src\WhatsApp.svelte generated by Svelte v3.37.0 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-107qhuq-style";
    	style.textContent = ".ssbc-button--whatsapp{background-color:#25d366}.ssbc-button--whatsapp:active,.ssbc-button--whatsapp:hover{background-color:#1da851}";
    	append(document.head, style);
    }

    // (20:0) <ShareButton   class="ssbc-button--whatsapp {classes}"   {...$$restProps}   {ariaLabel}   {href}  >
    function create_default_slot$1(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", "M20.1 3.9C17.9 1.7 15 .5 12 .5 5.8.5.7 5.6.7 11.9c0 2 .5 3.9 1.5 5.6L.6 23.4l6-1.6c1.6.9 3.5 1.3 5.4 1.3 6.3 0 11.4-5.1 11.4-11.4-.1-2.8-1.2-5.7-3.3-7.8zM12 21.4c-1.7 0-3.3-.5-4.8-1.3l-.4-.2-3.5 1 1-3.4L4 17c-1-1.5-1.4-3.2-1.4-5.1 0-5.2 4.2-9.4 9.4-9.4 2.5 0 4.9 1 6.7 2.8 1.8 1.8 2.8 4.2 2.8 6.7-.1 5.2-4.3 9.4-9.5 9.4zm5.1-7.1c-.3-.1-1.7-.9-1.9-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1s-1.2-.5-2.3-1.4c-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6s.3-.3.4-.5c.2-.1.3-.3.4-.5.1-.2 0-.4 0-.5C10 9 9.3 7.6 9 7c-.1-.4-.4-.3-.5-.3h-.6s-.4.1-.7.3c-.3.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.3-.3-.4-.6-.5z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--whatsapp " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--whatsapp " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 64) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const omit_props_names = ["text","ariaLabel","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { text } = $$props;
    	let { ariaLabel = "Share on WhatsApp" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;
    	console.log("isMobile: ", isMobile(window.navigator).any);

    	const origin = isMobile(window.navigator).any
    	? "whatsapp://send?text="
    	: "https://web.whatsapp.com/send?text=";

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("text" in $$new_props) $$invalidate(4, text = $$new_props.text);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*text*/ 16) {
    			$$invalidate(2, href = encodeURI(`${origin}${text}`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, text];
    }

    class WhatsApp extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-107qhuq-style")) add_css$1();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { text: 4, ariaLabel: 0, class: 1 });
    	}
    }

    /* src\Xing.svelte generated by Svelte v3.37.0 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-xr6cum-style";
    	style.textContent = ".ssbc-button--xing{background-color:#1a7576}.ssbc-button--xing:active,.ssbc-button--xing:hover{background-color:#114C4C}";
    	append(document.head, style);
    }

    // (26:0) <ShareButton class="ssbc-button--xing {classes}" {...$$restProps} {ariaLabel} {href}>
    function create_default_slot(ctx) {
    	let svg;
    	let path;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr(path, "d", "M10.2 9.7l-3-5.4C7.2 4 7 4 6.8 4h-5c-.3 0-.4 0-.5.2v.5L4 10 .4 16v.5c0 .2.2.3.4.3h5c.3 0 .4 0 .5-.2l4-6.6v-.5zM24 .2l-.5-.2H18s-.2 0-.3.3l-8 14v.4l5.2 9c0 .2 0 .3.3.3h5.4s.3 0 .4-.2c.2-.2.2-.4 0-.5l-5-8.8L24 .7V.2z");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 24 24");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let sharebutton;
    	let current;

    	const sharebutton_spread_levels = [
    		{
    			class: "ssbc-button--xing " + /*classes*/ ctx[1]
    		},
    		/*$$restProps*/ ctx[3],
    		{ ariaLabel: /*ariaLabel*/ ctx[0] },
    		{ href: /*href*/ ctx[2] }
    	];

    	let sharebutton_props = {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < sharebutton_spread_levels.length; i += 1) {
    		sharebutton_props = assign(sharebutton_props, sharebutton_spread_levels[i]);
    	}

    	sharebutton = new ShareButton({ props: sharebutton_props });

    	return {
    		c() {
    			create_component(sharebutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(sharebutton, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const sharebutton_changes = (dirty & /*classes, $$restProps, ariaLabel, href*/ 15)
    			? get_spread_update(sharebutton_spread_levels, [
    					dirty & /*classes*/ 2 && {
    						class: "ssbc-button--xing " + /*classes*/ ctx[1]
    					},
    					dirty & /*$$restProps*/ 8 && get_spread_object(/*$$restProps*/ ctx[3]),
    					dirty & /*ariaLabel*/ 1 && { ariaLabel: /*ariaLabel*/ ctx[0] },
    					dirty & /*href*/ 4 && { href: /*href*/ ctx[2] }
    				])
    			: {};

    			if (dirty & /*$$scope*/ 64) {
    				sharebutton_changes.$$scope = { dirty, ctx };
    			}

    			sharebutton.$set(sharebutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(sharebutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sharebutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(sharebutton, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	const omit_props_names = ["title","url","ariaLabel","class"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { title } = $$props;
    	let { url } = $$props;
    	let { ariaLabel = "Share on Xing" } = $$props;
    	let { class: classes = "" } = $$props;
    	let href;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("title" in $$new_props) $$invalidate(4, title = $$new_props.title);
    		if ("url" in $$new_props) $$invalidate(5, url = $$new_props.url);
    		if ("ariaLabel" in $$new_props) $$invalidate(0, ariaLabel = $$new_props.ariaLabel);
    		if ("class" in $$new_props) $$invalidate(1, classes = $$new_props.class);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*url, title*/ 48) {
    			$$invalidate(2, href = encodeURI(`https://www.xing.com/app/user?op=share;url=${url};title=${title}`));
    		}
    	};

    	return [ariaLabel, classes, href, $$restProps, title, url];
    }

    class Xing extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-xr6cum-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { title: 4, url: 5, ariaLabel: 0, class: 1 });
    	}
    }

    exports.Email = Email;
    exports.Facebook = Facebook;
    exports.HackerNews = HackerNews;
    exports.LinkedIn = LinkedIn;
    exports.Pinterest = Pinterest;
    exports.Reddit = Reddit;
    exports.Telegram = Telegram;
    exports.Tumblr = Tumblr;
    exports.Twitter = Twitter;
    exports.Vk = Vk;
    exports.WhatsApp = WhatsApp;
    exports.Xing = Xing;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
