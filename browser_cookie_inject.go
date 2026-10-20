package main

import (
	"bytes"
	"io"
	"net/http"
	"strconv"
	"strings"
)

const cookiePolyfillScript = `<script>(function(){try{var p=Document.prototype;var d=Object.getOwnPropertyDescriptor(p,'cookie')||Object.getOwnPropertyDescriptor(HTMLDocument.prototype,'cookie')||Object.getOwnPropertyDescriptor(document,'cookie');var store={};var deleted={};try{for(var i=0;i<sessionStorage.length;i++){var k=sessionStorage.key(i);if(k&&k.indexOf('__octa_c_')===0){store[k.substring(9)]=sessionStorage.getItem(k);}}}catch(e){}Object.defineProperty(document,'cookie',{get:function(){var nat=d&&d.get?d.get.call(document):'';var map={};if(nat){var parts=nat.split(';');for(var i=0;i<parts.length;i++){var eq=parts[i].indexOf('=');if(eq!==-1){var ck=parts[i].substring(0,eq).trim();if(!deleted[ck]){map[ck]=parts[i].substring(eq+1);}}}}for(var sk in store){map[sk]=store[sk];}var res=[];for(var mk in map){res.push(mk+'='+map[mk]);}return res.join('; ');},set:function(v){var s=String(v);var first=s.split(';')[0];var eqIdx=first.indexOf('=');if(eqIdx!==-1){var key=first.substring(0,eqIdx).trim();var val=first.substring(eqIdx+1);var isExp=false;var expM=s.match(/expires=([^;]+)/i);if(expM&&new Date(expM[1]).getTime()<=Date.now()){isExp=true;}if(isExp||s.match(/max-age=0/i)||val===''){delete store[key];deleted[key]=true;try{sessionStorage.removeItem('__octa_c_'+key);}catch(e){}}else{store[key]=val;delete deleted[key];try{sessionStorage.setItem('__octa_c_'+key,val);}catch(e){}}}if(!s.toLowerCase().includes('samesite=')){s+='; SameSite=None; Secure; Partitioned';}if(d&&d.set){try{d.set.call(document,s);}catch(e){}}},configurable:true});}catch(e){}function sendMeta(){try{var t=document.title?document.title.trim():'';var f='';var link=document.querySelector("link[rel~='icon']")||document.querySelector("link[rel*='icon']");if(link&&link.href){f=link.href;}else{f=window.location.origin+'/favicon.ico';}window.parent.postMessage({type:'OCTA_BROWSER_PAGE_META',title:t,favicon:f,url:window.location.href},'*');}catch(e){}}if(document.readyState==='complete'||document.readyState==='interactive'){sendMeta();}else{document.addEventListener('DOMContentLoaded',sendMeta);}window.addEventListener('load',sendMeta);try{var titleEl=document.querySelector('title');if(titleEl){new MutationObserver(sendMeta).observe(titleEl,{subtree:true,characterData:true,childList:true});}else{new MutationObserver(function(){var el=document.querySelector('title');if(el){sendMeta();new MutationObserver(sendMeta).observe(el,{subtree:true,characterData:true,childList:true});}}).observe(document.documentElement||document,{childList:true,subtree:true});}}catch(e){}window.addEventListener('hashchange',sendMeta);window.addEventListener('popstate',sendMeta);window.addEventListener('contextmenu',function(e){try{e.preventDefault();var sel='';try{sel=window.getSelection().toString();}catch(err){}window.parent.postMessage({type:'OCTA_CONTEXT_MENU',clientX:e.clientX,clientY:e.clientY,selectedText:sel},'*');}catch(err){}});window.addEventListener('click',function(){try{window.parent.postMessage({type:'OCTA_CLOSE_CONTEXT_MENU'},'*');}catch(e){}});window.addEventListener('message',function(ev){try{if(!ev.data||ev.data.type!=='OCTA_NAV_ACTION')return;if(ev.data.action==='back'){window.history.back();}else if(ev.data.action==='forward'){window.history.forward();}else if(ev.data.action==='reload'){window.location.reload();}else if(ev.data.action==='paste'&&ev.data.text){var active=document.activeElement;if(active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA'||active.isContentEditable)){if(active.isContentEditable){document.execCommand('insertText',false,ev.data.text);}else{var start=active.selectionStart||0;var end=active.selectionEnd||0;var val=active.value||'';active.value=val.substring(0,start)+ev.data.text+val.substring(end);active.selectionStart=active.selectionEnd=start+ev.data.text.length;active.dispatchEvent(new Event('input',{bubbles:true}));active.dispatchEvent(new Event('change',{bubbles:true}));}}}}catch(e){}});})();</script>`

// injectCookiePolyfill injects client-side polyfills into HTML responses:
// 1. document.cookie storage polyfill for cross-origin iframes
// 2. Real-time page title and favicon reporter to parent window
// 3. Right-click context menu and navigation bridge (back, forward, reload, paste)
func injectCookiePolyfill(res *http.Response) {
	cType := strings.ToLower(res.Header.Get("Content-Type"))
	if !strings.Contains(cType, "text/html") {
		return
	}

	bodyBytes, err := io.ReadAll(res.Body)
	_ = res.Body.Close()
	if err != nil {
		return
	}

	htmlStr := string(bodyBytes)
	lower := strings.ToLower(htmlStr)

	if strings.Contains(lower, "<head>") {
		htmlStr = strings.Replace(htmlStr, "<head>", "<head>"+cookiePolyfillScript, 1)
	} else if idx := strings.Index(lower, "<head"); idx != -1 {
		endIdx := strings.Index(htmlStr[idx:], ">")
		if endIdx != -1 {
			pos := idx + endIdx + 1
			htmlStr = htmlStr[:pos] + cookiePolyfillScript + htmlStr[pos:]
		} else {
			htmlStr = cookiePolyfillScript + htmlStr
		}
	} else {
		htmlStr = cookiePolyfillScript + htmlStr
	}

	newBytes := []byte(htmlStr)
	res.Body = io.NopCloser(bytes.NewReader(newBytes))
	res.ContentLength = int64(len(newBytes))
	res.Header.Set("Content-Length", strconv.Itoa(len(newBytes)))
}
