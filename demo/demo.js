var style = document.createElement("style");

addEventListener("load", () => {

	let cs = document.querySelectorAll(".colorselector > *");
	cs.forEach(c => c.addEventListener("change", updateColors));
	document.querySelector("head").appendChild(style);
	updateColors();
	showPresets();
	const p = presets[Math.floor(Math.random() * presets.length)];
	applyPreset(p);

	document.querySelector(".colorselector .config").addEventListener("click", toggleSettings);
	document.querySelector(".settings .close").addEventListener("click", toggleSettings);

});

function updateColors() {
	let cs = document.querySelectorAll(".colorselector > *");
	let p = {main: cs[0].value, text: cs[1].value, bg: cs[2].value};
	console.log(p);
	let t = new Theme(p);
	t.apply();
}

function toggleSettings() {
	document.querySelector(".settings").classList.toggle("open");
}

let presets = [
	{main: "#2ebdf5", text: "#ffffff", bg: "#040813"},
	{main: "#f5b62e", text: "#ffffff", bg: "#040813"},
	{main: "#FF6565", text: "#ffffff", bg: "#0f0413"},
	{main: "#9b8fe4", text: "#cfcef4", bg: "#090818", siteBg: "#100E22"},
	{main: "#337e2c", text: "#031601", bg: "#f3f7f2"},
	{main: "#1c71d8", text: "#030e1c", bg: "#ffffff"},
	{main: "#9141ac", text: "#613583", bg: "#f6edf7"},
	{main: "#a51d2d", text: "#3d3846", bg: "#f1e9e8"},
	{main: "#865e3c", text: "#63452c", bg: "#f9f7f4", siteBg: "#ffffff"}
];

function showPresets() {
	let presetsEl = document.querySelector(".presets");
	presets.forEach(p => {
		let el = document.createElement("div");
		el.innerHTML = `
		<div style="background-color: ${p.main};"></div>
		<div style="background-color: ${p.text};"></div>
		<div style="background-color: ${p.bg};"></div>`;
		el.addEventListener("click", () => {
			applyPreset(p);
		});
		presetsEl.appendChild(el);
	});
}

function applyPreset(p) {
	let cs = document.querySelectorAll(".colorselector > *");
	cs[0].value = p.main;
	cs[1].value = p.text;
	cs[2].value = p.bg;
	updateColors();
	let html = document.querySelector("html");
	html.style = "";
	if(p.siteBg) html.style.background = p.siteBg;
}

class Color {

	r;
	g;
	b;
	a;

	constructor(r, g, b, a = 1) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}

	clone() {
		return new Color(this.r, this.g, this.b, this.a);
	}

	static fromHex(hex) {
		return new Color(...this.hexToRgb(hex));
	}

	static hexToRgb(hex) {
		hex = hex.replace(/^#/, '');
		const r = parseInt(hex.slice(0, 2), 16) / 255;
		const g = parseInt(hex.slice(2, 4), 16) / 255;
		const b = parseInt(hex.slice(4, 6), 16) / 255;
		return [r, g, b];
	}

	rgbFormat() {
		return `rgba(${this.r*255}, ${this.g*255}, ${this.b*255}, ${this.a})`;
	}

	contrast(otherColor) {
		const getRelativeLuminance = (rgb) => {
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

	equals(otherColor) {
		return this.r == otherColor.r && this.g == otherColor.g && this.b == otherColor.b && this.a == otherColor.a;
	}

}

class Theme {

	main;
	text;
	bg;

	constructor(opt) {

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
	
		let styles = [`:root {${variables.join("")}}`];
	
		let btnColor = this.getBtnColor(this.main, this.text);
		if(btnColor != this.text) styles.push(`.btn.btn-primary {${this.var("text-color", btnColor.rgbFormat())}}`);

		return styles.join("\n");

	}

	getBtnColor(main, text) {
		let white = new Color(1, 1, 1);
		let black = new Color(0, 0, 0);
		let cText = main.contrast(text);
		let cWhite = main.contrast(white);
		return cWhite > .3 ? white : cText > .3 ? text : black;
	}

	cArgb(color, alpha = 1) {
		let c = color.clone();
		c.a = alpha;
		return c.rgbFormat();
	}

	var(name, value) {
		return `--synergy-${name}: ${value};`;
	}

}