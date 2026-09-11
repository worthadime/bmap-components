/** vendor 脚本文本模块（tsup text loader → Blob URL 运行时注入） */
declare module '*.txt' {
  const content: string;
  export default content;
}

/** 图标资源（tsup dataurl loader → base64 内联） */
declare module '*.png' {
  const dataUrl: string;
  export default dataUrl;
}
