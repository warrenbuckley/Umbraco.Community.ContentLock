export class DomNodeUtils {
    static findInShadowRoot(node: ShadowRoot | Document | null, selector: string): HTMLElement | null {
        if(!node)
        {
            return null;
        }

        // Check if the current node contains the element we are looking for
        const targetElement = node.querySelector(selector) as HTMLElement;
        if(targetElement){
            return targetElement;
        }

        // Recursively search through all the shadow roots of the children
        const elements = node.querySelectorAll('*');
        for(const element of elements){
            if(element.shadowRoot){
                const tryFindElement = this.findInShadowRoot(element.shadowRoot, selector);
                if(tryFindElement){
                    return tryFindElement;
                }
            }
        }

        return null;
    }
}