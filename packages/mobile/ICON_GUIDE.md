# 📱 Guia para Criar Ícone do App

## 🎯 Objetivo

Criar o ícone do app (`icon.png`) que aparece na tela de download do iOS e na home screen dos dispositivos.

## 📐 Especificações

### iOS
- **Tamanho**: 1024x1024 pixels
- **Formato**: PNG
- **Background**: Pode ser transparente ou com cor sólida
- **Localização**: `packages/mobile/assets/icon.png`

### Android
- **Tamanho**: 512x512 pixels (mas o adaptive-icon precisa de 1024x1024 também
- **Formato**: PNG
- **Background**: Cor sólida (definida no `app.json` como `backgroundColor: "#2563EB"`)
- **Localização**: `packages/mobile/assets/adaptive-icon.png`

## 🎨 Design

O ícone deve:
1. Usar o logo `logo_flat.svg` como base
2. Ter fundo branco ou azul (`#2563EB`)
3. Manter o logo centralizado
4. Ter bordas arredondadas (o iOS aplica automaticamente)

## 🛠️ Como Criar

### Opção 1: Usando Figma/Sketch
1. Abra o `logo_flat.svg` no Figma/Sketch
2. Crie um canvas de 1024x1024px
3. Centralize o logo
4. Adicione fundo branco ou azul
5. Exporte como PNG

### Opção 2: Usando ferramentas online
- [App Icon Generator](https://www.appicon.co/)
- [Icon Kitchen](https://icon.kitchen/)
- [MakeAppIcon](https://makeappicon.com/)

### Opção 3: Usando ImageMagick/Inkscape
```bash
# Converter SVG para PNG 1024x1024
inkscape logo_flat.svg --export-filename=icon.png --export-width=1024 --export-height=1024
```

## 📝 Nota Importante

O ícone atual (`icon.png`) é um placeholder. **Você precisa substituí-lo** pelo logo oficial antes de publicar nas lojas.

## ✅ Checklist

- [ ] Criar `icon.png` 1024x1024px com logo azul em fundo branco
- [ ] Criar `adaptive-icon.png` 1024x1024px para Android
- [ ] Criar `splash-icon.png` para splash screen
- [ ] Testar visualização na home screen do iOS
- [ ] Testar visualização na home screen do Android

