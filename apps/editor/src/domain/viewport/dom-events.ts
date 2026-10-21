export const previewDomEventOptions = [
  ['click', 'Click'],
  ['doubleclick', 'Double click'],
  ['change', 'Change'],
  ['input', 'Input'],
  ['submit', 'Submit'],
  ['focus', 'Focus'],
  ['blur', 'Blur'],
  ['keydown', 'Key down'],
  ['keyup', 'Key up'],
  ['pointerdown', 'Pointer down'],
  ['pointerup', 'Pointer up'],
  ['pointermove', 'Pointer move'],
  ['pointerenter', 'Pointer enter'],
  ['pointerleave', 'Pointer leave'],
  ['mousedown', 'Mouse down'],
  ['mouseup', 'Mouse up'],
  ['mouseenter', 'Mouse enter'],
  ['mouseleave', 'Mouse leave'],
  ['dragstart', 'Drag start'],
  ['drag', 'Drag'],
  ['dragenter', 'Drag enter'],
  ['dragover', 'Drag over'],
  ['dragleave', 'Drag leave'],
  ['drop', 'Drop'],
  ['dragend', 'Drag end'],
  ['contextmenu', 'Context menu'],
] as const;

export type PreviewDomEventName = (typeof previewDomEventOptions)[number][0];

const reactEventNames: Readonly<Record<PreviewDomEventName, string>> = {
  click: 'onClick',
  doubleclick: 'onDoubleClick',
  change: 'onChange',
  input: 'onInput',
  submit: 'onSubmit',
  focus: 'onFocus',
  blur: 'onBlur',
  keydown: 'onKeyDown',
  keyup: 'onKeyUp',
  pointerdown: 'onPointerDown',
  pointerup: 'onPointerUp',
  pointermove: 'onPointerMove',
  pointerenter: 'onPointerEnter',
  pointerleave: 'onPointerLeave',
  mousedown: 'onMouseDown',
  mouseup: 'onMouseUp',
  mouseenter: 'onMouseEnter',
  mouseleave: 'onMouseLeave',
  dragstart: 'onDragStart',
  drag: 'onDrag',
  dragenter: 'onDragEnter',
  dragover: 'onDragOver',
  dragleave: 'onDragLeave',
  drop: 'onDrop',
  dragend: 'onDragEnd',
  contextmenu: 'onContextMenu',
};

export function reactEventPropFor(eventName: string) {
  return Object.hasOwn(reactEventNames, eventName)
    ? reactEventNames[eventName as PreviewDomEventName]
    : undefined;
}
