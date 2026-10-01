// Reconciler 只调用 Host 接口；JSON 宿主便于无浏览器测试。
export function createJsonHost() {
  const container = { children: [] };
  return {
    container,
    create(type, props) {
      return type === "#text"
        ? { text: props.nodeValue }
        : { type, props: {}, children: [] };
    },
    update(node, type, props, children) {
      if (type === "#text") node.text = props.nodeValue;
      else {
        const { children: ignored, ...attributes } = props;
        void ignored;
        node.props = { ...attributes };
        node.children = children;
      }
    },
    replace(children) {
      container.children = children;
    },
    snapshot() {
      return structuredClone(container.children);
    },
  };
}

export function createDomHost(container) {
  if (!container || typeof container.replaceChildren !== "function") {
    throw new TypeError("需要真实 DOM 容器");
  }
  return {
    container,
    create(type, props) {
      return type === "#text"
        ? container.ownerDocument.createTextNode(props.nodeValue)
        : container.ownerDocument.createElement(type);
    },
    update(node, type, props, children) {
      if (type === "#text") {
        node.nodeValue = props.nodeValue;
        return;
      }
      // 教学版只处理常见属性；不模拟 React DOM 的事件与受控输入系统。
      for (const name of node.getAttributeNames()) node.removeAttribute(name);
      for (const [name, value] of Object.entries(props)) {
        if (name === "children" || name.startsWith("on") || value == null)
          continue;
        node.setAttribute(name === "className" ? "class" : name, String(value));
      }
      node.replaceChildren(...children);
    },
    replace(children) {
      container.replaceChildren(...children);
    },
    snapshot() {
      return container.innerHTML;
    },
  };
}
