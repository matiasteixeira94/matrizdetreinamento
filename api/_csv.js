// Parser CSV minimalista (RFC4180: campos entre aspas podem conter o
// delimitador, quebras de linha e aspas escapadas como ""). Evita puxar uma
// dependência externa só para isso — o formato de origem é bem definido
// (export do datalake da Viana & Moura, delimitado por ";").
"use strict";

function parseCSV(texto, delimitador = ";") {
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1); // BOM
  const linhas = [];
  let linha = [];
  let campo = "";
  let entreAspas = false;
  const len = texto.length;

  for (let i = 0; i < len; i++) {
    const c = texto[i];
    if (entreAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else entreAspas = false;
      } else {
        campo += c;
      }
      continue;
    }
    if (c === '"') { entreAspas = true; continue; }
    if (c === delimitador) { linha.push(campo); campo = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; continue; }
    campo += c;
  }
  if (campo.length > 0 || linha.length > 0) { linha.push(campo); linhas.push(linha); }
  if (!linhas.length) return [];

  const cabecalho = linhas[0].map((h) => h.trim());
  const registros = [];
  for (let r = 1; r < linhas.length; r++) {
    const cols = linhas[r];
    if (cols.length === 1 && cols[0].trim() === "") continue; // linha em branco no fim do arquivo
    const obj = {};
    cabecalho.forEach((h, ci) => {
      const v = (cols[ci] ?? "").trim();
      obj[h] = v === "" ? null : v;
    });
    registros.push(obj);
  }
  return registros;
}

export { parseCSV };
