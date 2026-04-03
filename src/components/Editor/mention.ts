import Mention from "@tiptap/extension-mention";

const CustomMention = Mention.extend({
  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      {
        ...HTMLAttributes,
        "data-mention-id": node.attrs.id,
        "data-mention": node.attrs.label,
      },
      node.attrs.label ?? "",
    ];
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-mention-id"),
      },
      label: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-mention"),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-mention]" }];
  },
});

export default CustomMention;
