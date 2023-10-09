import { reactive } from "petite-vue";

var style = document.createElement("style");

addEventListener("load", () => {
	
	document.querySelector("head")!.appendChild(style);

});

export namespace Exporter {

	export let parts = reactive([
		{name: "Buttons", file: "button", enabled: true},
		{name: "Fields", file: "input", enabled: true},
		{name: "Toggles", file: "toggle", enabled: true},
		{name: "Checkboxes and radios", file: "checkbox", enabled: true},
	]);

	interface Result {
		name: string,
		css: string,
		size: number,
		size_gzip: number
	}

	export async function get(theme: Theme) {

		let cssParts = [theme.generate()];
		for(let p of parts) {
			if(p.enabled) {
				let value = await (await fetch(`./${p.file}.css`)).text();
				value = `/* ${p.name} */\n\n${value}`;
				cssParts.push(value);
			}
		}
		let css = cssParts.join("\n\n/* ------------------- */\n\n");

		let results: Result[] = [];
		await addResult(results, "synergy.min.css", minify(css));
		await addResult(results, "synergy.css", css);

		return results;

	}

	async function addResult(results: Result[], name: string, css: string) {
		results.push({
			name,
			css,
			size: getSize(css),
			size_gzip: await getCompressedSize(css)
		});
	}

	async function getCompressedSize(content: string) {
		let ds = new CompressionStream("gzip");
		let blob = new Blob([content]);
		let compressedStream = blob.stream().pipeThrough(ds);
		return (await new Response(compressedStream).blob()).size;
	}  

	function getSize(content: string) {
		return (new TextEncoder().encode(content)).length
	}

	function minify(value: string) {
		return value
		  .replace(/([^0-9a-zA-Z\.#])\s+/g, "$1")
		  .replace(/\s([^0-9a-zA-Z\.#]+)/g, "$1")
		  .replace(/;}/g, "}")
		  .replace(/\/\*.*?\*\//g, "");
	}

}

export interface Preset {
	main: string,
	text: string,
	bg: string,
	siteBg?: string
}

export class Color {

	r: number;
	g: number;
	b: number;
	a: number;

	constructor(r: number, g: number, b: number, a: number = 1) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}

	clone() {
		return new Color(this.r, this.g, this.b, this.a);
	}

	static fromHex(hex: string) {
		let [r, g, b] = this.hexToRgb(hex);
		return new Color(r, g, b);
	}

	static hexToRgb(hex: string) {
		hex = hex.replace(/^#/, '');
		const r = parseInt(hex.slice(0, 2), 16) / 255;
		const g = parseInt(hex.slice(2, 4), 16) / 255;
		const b = parseInt(hex.slice(4, 6), 16) / 255;
		return [r, g, b];
	}

	rgbFormat() {
		return `rgba(${this.r*255}, ${this.g*255}, ${this.b*255}, ${this.a})`;
	}

	contrast(otherColor: Color) {
		const getRelativeLuminance = (rgb: number) => {
		  const sRGB = rgb / 255;
		  return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
		};
		const luminance1 = getRelativeLuminance(this.r) * 0.2126 +
						   getRelativeLuminance(this.g) * 0.7152 +
						   getRelativeLuminance(this.b) * 0.0722;
		const luminance2 = getRelativeLuminance(otherColor.r) * 0.2126 +
						   getRelativeLuminance(otherColor.g) * 0.7152 +
						   getRelativeLuminance(otherColor.b) * 0.0722;
		const contrastRatio = (Math.max(luminance1, luminance2) + 0.05) / (Math.min(luminance1, luminance2) + 0.05);
		return (contrastRatio*100)-100;
	}

	equals(otherColor: Color) {
		return this.r == otherColor.r && this.g == otherColor.g && this.b == otherColor.b && this.a == otherColor.a;
	}

}

export class Theme {

	main: Color;
	text: Color;
	bg: Color;

	constructor(opt: Preset) {

		this.main = Color.fromHex(opt.main);
		this.text = Color.fromHex(opt.text);
		this.bg = Color.fromHex(opt.bg);

	}

	apply() {
		style.innerHTML = this.generate();
	}

	generate() {

		let variables = [];
	
		variables.push(this.var("border", this.cArgb(this.main, .4)));
		variables.push(this.var("border-active", this.cArgb(this.main)));

		variables.push(this.var("focus-highlight", this.cArgb(this.main, .25)));
	
		variables.push(this.var("label", this.cArgb(this.main, .8)));
		variables.push(this.var("label-active", this.cArgb(this.main)));
	
		variables.push(this.var("btn-primary-bg", this.cArgb(this.main, .8)));
		variables.push(this.var("btn-primary-bg-active", this.cArgb(this.main, .5)));
		variables.push(this.var("btn-primary-bg-hover", this.cArgb(this.main)));
	
		let btnBg = new Color(.6, .6, .6);
		variables.push(this.var("btn-bg", this.cArgb(btnBg, .3)));
		variables.push(this.var("btn-bg-active", this.cArgb(btnBg, .6)));
		variables.push(this.var("btn-bg-hover", this.cArgb(btnBg, .4)));
	
		variables.push(this.var("text-color", this.text.rgbFormat()));
		variables.push(this.var("bg", this.bg.rgbFormat()));
	
		if(this.main.contrast(this.bg) < .3) alert("Contrast between main color and the background is low!");
		if(this.bg.contrast(this.text) < .3) alert("Contrast between text color and the background is low!");
	
		let styles = [`:root {\n${variables.join("\n")}\n}`];
	
		let btnColor = this.getBtnColor(this.main, this.text);
		if(btnColor != this.text) styles.push(`.btn.btn-primary {\n${this.var("text-color", btnColor.rgbFormat())}\n}`);

		return styles.join("\n\n");

	}

	getBtnColor(main: Color, text: Color) {
		let white = new Color(1, 1, 1);
		let black = new Color(0, 0, 0);
		let cText = main.contrast(text);
		let cWhite = main.contrast(white);
		return cWhite > .3 ? white : cText > .3 ? text : black;
	}

	cArgb(color: Color, alpha: number = 1) {
		let c = color.clone();
		c.a = alpha;
		return c.rgbFormat();
	}

	var(name: string, value: string) {
		return `\t--synergy-${name}: ${value};`;
	}

}