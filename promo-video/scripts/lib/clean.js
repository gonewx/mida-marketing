// 在 Stitch 页面内执行：隐藏原型「狀態切換/演示」调试控制条，只保留产品界面本身
(() => {
  const re = /原型|演示|狀態切換|状态切换|Prototype|DEMO STATE/i;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const hits = [];
  while (walker.nextNode()) if (re.test(walker.currentNode.nodeValue)) hits.push(walker.currentNode.parentElement);
  for (let el of hits) {
    // 向上找到仍然只包含调试条内容的最大容器
    while (el.parentElement && !['HEADER', 'MAIN', 'BODY', 'NAV'].includes(el.parentElement.tagName)
      && el.parentElement.textContent.length < 260) el = el.parentElement;
    el.style.display = 'none';
  }
})();
