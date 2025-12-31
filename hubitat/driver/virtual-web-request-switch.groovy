import groovy.json.JsonSlurper

metadata {
    definition(
        name: "Virtual Web Request Switch",
        namespace: "jvshomecontrol",
        author: "Jeremy Henderson",
        importUrl: "https://raw.githubusercontent.com/jeamajoal/jvshomecontrol/main/hubitat/driver/virtual-web-request-switch.groovy"
    ) {
        capability "Switch"
        capability "Actuator"
        capability "Initialize"
    }

    preferences {
        section("ON Requests") {
            input name: "onCallCount", type: "enum", title: "How many ON web calls?", required: true, defaultValue: "1",
                options: ["1", "2", "3", "4", "5"]

            input name: "onEnabled1", type: "bool", title: "ON Call 1: Enabled", defaultValue: true
            input name: "onUrl", type: "text", title: "ON Call 1: URL", required: false
            input name: "onMethod", type: "enum", title: "ON Call 1: Method", required: true, defaultValue: "POST",
                options: ["GET", "POST", "PUT", "PATCH", "DELETE"]
            input name: "onHeaders", type: "text", title: "ON Call 1: Headers (JSON or Header: Value per line)", required: false
            input name: "onBody", type: "text", title: "ON Call 1: Body", required: false
            input name: "onRequestContentType", type: "enum", title: "ON Call 1: Request Content-Type", required: true,
                defaultValue: "application/json",
                options: ["application/json", "application/x-www-form-urlencoded", "text/plain"]

            Integer _onCount = safeCallCount(settings?.onCallCount, 1)
            (2..5).each { i ->
                if (i <= _onCount) {
                    input name: "onEnabled${i}", type: "bool", title: "ON Call ${i}: Enabled", defaultValue: false
                    input name: "onUrl${i}", type: "text", title: "ON Call ${i}: URL", required: false
                    input name: "onMethod${i}", type: "enum", title: "ON Call ${i}: Method", required: true, defaultValue: "POST",
                        options: ["GET", "POST", "PUT", "PATCH", "DELETE"]
                    input name: "onHeaders${i}", type: "text", title: "ON Call ${i}: Headers (JSON or Header: Value per line)", required: false
                    input name: "onBody${i}", type: "text", title: "ON Call ${i}: Body", required: false
                    input name: "onRequestContentType${i}", type: "enum", title: "ON Call ${i}: Request Content-Type", required: true,
                        defaultValue: "application/json",
                        options: ["application/json", "application/x-www-form-urlencoded", "text/plain"]
                }
            }
        }

        section("OFF Requests") {
            input name: "offCallCount", type: "enum", title: "How many OFF web calls?", required: true, defaultValue: "1",
                options: ["1", "2", "3", "4", "5"]

            input name: "offEnabled1", type: "bool", title: "OFF Call 1: Enabled", defaultValue: true
            input name: "offUrl", type: "text", title: "OFF Call 1: URL", required: false
            input name: "offMethod", type: "enum", title: "OFF Call 1: Method", required: true, defaultValue: "POST",
                options: ["GET", "POST", "PUT", "PATCH", "DELETE"]
            input name: "offHeaders", type: "text", title: "OFF Call 1: Headers (JSON or Header: Value per line)", required: false
            input name: "offBody", type: "text", title: "OFF Call 1: Body", required: false
            input name: "offRequestContentType", type: "enum", title: "OFF Call 1: Request Content-Type", required: true,
                defaultValue: "application/json",
                options: ["application/json", "application/x-www-form-urlencoded", "text/plain"]

            Integer _offCount = safeCallCount(settings?.offCallCount, 1)
            (2..5).each { i ->
                if (i <= _offCount) {
                    input name: "offEnabled${i}", type: "bool", title: "OFF Call ${i}: Enabled", defaultValue: false
                    input name: "offUrl${i}", type: "text", title: "OFF Call ${i}: URL", required: false
                    input name: "offMethod${i}", type: "enum", title: "OFF Call ${i}: Method", required: true, defaultValue: "POST",
                        options: ["GET", "POST", "PUT", "PATCH", "DELETE"]
                    input name: "offHeaders${i}", type: "text", title: "OFF Call ${i}: Headers (JSON or Header: Value per line)", required: false
                    input name: "offBody${i}", type: "text", title: "OFF Call ${i}: Body", required: false
                    input name: "offRequestContentType${i}", type: "enum", title: "OFF Call ${i}: Request Content-Type", required: true,
                        defaultValue: "application/json",
                        options: ["application/json", "application/x-www-form-urlencoded", "text/plain"]
                }
            }
        }

        section("Behavior") {
            input name: "timeoutSeconds", type: "number", title: "HTTP timeout (seconds)", required: true, defaultValue: 10
            input name: "useAsync", type: "bool", title: "Use async HTTP (non-blocking)", defaultValue: true
            input name: "stateOnSuccessOnly", type: "bool", title: "Update switch state only when ALL calls return 2xx", defaultValue: false
        }

        section("Logging") {
            input name: "debugLogging", type: "bool", title: "Enable debug logging", defaultValue: false
            input name: "descriptionText", type: "bool", title: "Enable description text logging", defaultValue: true
        }
    }
}

// Lifecycle

def installed() {
    log.info "Installed"
    initialize()
}

def updated() {
    log.info "Updated"
    initialize()
}

def initialize() {
    if (device.currentValue("switch") == null) {
        sendEvent(name: "switch", value: "off")
    }
}

// Capability: Switch

def on() {
    logDebug "on()"
    boolean started = sendWebRequest("on", "on")
    if (!settings.stateOnSuccessOnly || !started) {
        applySwitchState("on")
    }
}

def off() {
    logDebug "off()"
    boolean started = sendWebRequest("off", "off")
    if (!settings.stateOnSuccessOnly || !started) {
        applySwitchState("off")
    }
}

// Internals

private boolean sendWebRequest(String action, String desiredSwitchValue) {
    List<Map> calls = getConfiguredCalls(action)
    if (!calls) {
        logDesc "${action.toUpperCase()}: No enabled calls configured; skipping web request"
        return false
    }

    Long requestId = now()
    if (settings.stateOnSuccessOnly) {
        state.pendingRequest = [
            id: requestId,
            action: action,
            desiredSwitchValue: desiredSwitchValue,
            remaining: calls.size(),
            failed: false
        ]
    }

    logDebug "${action.toUpperCase()}: Starting ${calls.size()} call(s) (async=${settings.useAsync}, successOnly=${settings.stateOnSuccessOnly})"

    calls.each { call ->
        Integer idx = call.index as Integer
        Map params = buildHttpRequestParams(call.url, call.method, call.headers, call.body, call.requestContentType)
        logDebug "${action.toUpperCase()}: Call ${idx} HTTP ${params.method} ${params.uri}"

        try {
            if (settings.useAsync) {
                executeHttpAsync(params, action, desiredSwitchValue, requestId, idx)
            } else {
                executeHttp(params) { resp ->
                    handleHttpResponse(action, desiredSwitchValue, resp, requestId, idx)
                }
            }
        } catch (Exception e) {
            log.warn "${action.toUpperCase()}: Call ${idx} failed to start: ${e.message}"
            logDebug "${action.toUpperCase()}: Call ${idx} exception: ${e}"
            if (settings.stateOnSuccessOnly) {
                markPendingFailure(requestId)
                decrementPendingAndMaybeApply(requestId)
            }
        }
    }

    if (settings.stateOnSuccessOnly && !settings.useAsync) {
        // Sync path: handleHttpResponse will decrement pending and apply state.
    }

    return true
}

private Map buildHttpRequestParams(String urlString, String method, Map headers, String body, String requestContentType) {
    // Hubitat's sandbox can be restrictive around java.net.URL usage.
    // Passing the full URL as `uri` works with httpGet/httpPost/etc.
    Map params = [
        method: (method ?: "GET").toUpperCase(),
        uri: urlString,
        headers: headers ?: [:],
        timeout: safeTimeoutSeconds()
    ]

    boolean allowsBody = !(params.method in ["GET", "HEAD"]) && (body != null) && (body.toString().trim().length() > 0)
    if (allowsBody) {
        // Hubitat expects request body content type in `contentType`
        params.contentType = requestContentType
        params.body = body
    }

    return params
}

private void executeHttp(Map params, Closure responseHandler) {
    String m = (params?.method ?: "GET").toUpperCase()
    Map callParams = new LinkedHashMap(params)
    callParams.remove("method")

    switch (m) {
        case "GET":
            httpGet(callParams, responseHandler)
            break
        case "POST":
            httpPost(callParams, responseHandler)
            break
        case "PUT":
            httpPut(callParams, responseHandler)
            break
        case "PATCH":
            // Available on Hubitat for most hubs/firmware; if not, this will throw and be logged.
            httpPatch(callParams, responseHandler)
            break
        case "DELETE":
            httpDelete(callParams, responseHandler)
            break
        default:
            throw new IllegalArgumentException("Unsupported HTTP method: ${m}")
    }
}

private void executeHttpAsync(Map params, String action, String desiredSwitchValue, Long requestId, Integer callIndex) {
    String m = (params?.method ?: "GET").toUpperCase()
    Map callParams = new LinkedHashMap(params)
    callParams.remove("method")

    // `data` is returned to the callback so we can tag logs with ON/OFF.
    Map data = [action: action, method: m, url: params?.uri, desiredSwitchValue: desiredSwitchValue, requestId: requestId, callIndex: callIndex]

    switch (m) {
        case "GET":
            asynchttpGet("httpCallback", callParams, data)
            break
        case "POST":
            asynchttpPost("httpCallback", callParams, data)
            break
        case "PUT":
            asynchttpPut("httpCallback", callParams, data)
            break
        case "DELETE":
            asynchttpDelete("httpCallback", callParams, data)
            break
        case "PATCH":
            // Not available on all hub firmware; fall back to sync when missing.
            logDebug "${action.toUpperCase()}: async PATCH not supported on some hubs; using sync"
            executeHttp(params) { resp ->
                handleHttpResponse(action, desiredSwitchValue, resp, requestId, callIndex)
            }
            break
        default:
            throw new IllegalArgumentException("Unsupported HTTP method: ${m}")
    }
}

def httpCallback(resp, data) {
    String action = (data?.action ?: "").toString().toUpperCase()
    try {
        Integer status = resp?.status
        Integer callIndex = (data?.callIndex as Integer)
        Long requestId = (data?.requestId as Long)
        logDebug "${action}: async call ${callIndex} status=${status}" + (resp?.data != null ? ", hasBody=true" : ", hasBody=false")

        if (settings.stateOnSuccessOnly) {
            if (!is2xx(status)) {
                markPendingFailure(requestId)
            }
            decrementPendingAndMaybeApply(requestId)
        }
    } catch (Exception e) {
        log.warn "${action}: async callback error: ${e.message}"
        logDebug "${action}: ${e}"
    }
}

private void handleHttpResponse(String action, String desiredSwitchValue, resp, Long requestId, Integer callIndex) {
    Integer status = resp?.status
    logDebug "${action.toUpperCase()}: call ${callIndex} status=${status}" + (resp?.data != null ? ", hasBody=true" : ", hasBody=false")

    if (settings.stateOnSuccessOnly) {
        if (!is2xx(status)) {
            markPendingFailure(requestId)
        }
        decrementPendingAndMaybeApply(requestId)
    }
}

private boolean is2xx(Integer status) {
    return status != null && status >= 200 && status <= 299
}

private void markPendingFailure(Long requestId) {
    Map pending = (state.pendingRequest instanceof Map) ? (state.pendingRequest as Map) : null
    if (pending?.id == requestId) {
        pending.failed = true
        state.pendingRequest = pending
    }
}

private void decrementPendingAndMaybeApply(Long requestId) {
    Map pending = (state.pendingRequest instanceof Map) ? (state.pendingRequest as Map) : null
    if (pending?.id != requestId) return

    Integer remaining = (pending.remaining as Integer) ?: 0
    remaining = remaining - 1
    pending.remaining = remaining
    state.pendingRequest = pending

    if (remaining <= 0) {
        if (pending.failed) {
            log.warn "${(pending.action ?: "").toString().toUpperCase()}: Not updating switch state (one or more calls failed)"
        } else {
            String desired = (pending.desiredSwitchValue ?: "").toString()
            if (desired) {
                applySwitchState(desired)
            }
        }
        state.pendingRequest = null
    }
}

private List<Map> getConfiguredCalls(String action) {
    Integer count = (action == "on") ? safeCallCount(settings?.onCallCount, 1) : safeCallCount(settings?.offCallCount, 1)
    List<Map> calls = []

    (1..count).each { i ->
        boolean enabled = safeBoolSetting(action, "Enabled", i, (i == 1))
        if (!enabled) return

        String url = (i == 1)
            ? ((action == "on") ? (settings.onUrl ?: "") : (settings.offUrl ?: ""))
            : ((action == "on") ? (settings["onUrl${i}"] ?: "") : (settings["offUrl${i}"] ?: ""))

        url = (url ?: "").toString().trim()
        if (!url) return

        String method = (i == 1)
            ? ((action == "on") ? (settings.onMethod ?: "POST") : (settings.offMethod ?: "POST"))
            : ((action == "on") ? (settings["onMethod${i}"] ?: "POST") : (settings["offMethod${i}"] ?: "POST"))

        String rawHeaders = (i == 1)
            ? ((action == "on") ? (settings.onHeaders ?: "") : (settings.offHeaders ?: ""))
            : ((action == "on") ? (settings["onHeaders${i}"] ?: "") : (settings["offHeaders${i}"] ?: ""))

        String body = (i == 1)
            ? ((action == "on") ? (settings.onBody ?: "") : (settings.offBody ?: ""))
            : ((action == "on") ? (settings["onBody${i}"] ?: "") : (settings["offBody${i}"] ?: ""))

        String requestContentType = (i == 1)
            ? ((action == "on") ? (settings.onRequestContentType ?: "application/json") : (settings.offRequestContentType ?: "application/json"))
            : ((action == "on") ? (settings["onRequestContentType${i}"] ?: "application/json") : (settings["offRequestContentType${i}"] ?: "application/json"))

        Map<String, String> headers = parseHeaders(rawHeaders?.toString())

        calls << [
            index: i,
            url: url,
            method: method?.toString(),
            headers: headers,
            body: body?.toString(),
            requestContentType: requestContentType?.toString()
        ]
    }

    return calls
}

private boolean safeBoolSetting(String action, String field, Integer index, boolean defaultValue) {
    String key = "${action}${field}${index}"
    def raw = settings?.get(key)
    if (raw == null) return defaultValue
    if (raw instanceof Boolean) return (raw as Boolean)
    return raw.toString().toLowerCase() in ["true", "1", "yes", "on"]
}

private Integer safeCallCount(def raw, Integer defaultValue) {
    Integer c
    try {
        c = raw as Integer
    } catch (Exception ignored) {
        c = defaultValue
    }
    if (c == null) c = defaultValue
    if (c < 1) c = 1
    if (c > 5) c = 5
    return c
}

private void applySwitchState(String value) {
    String desc = null
    if (settings.descriptionText) {
        desc = (value == "on")
            ? "${device.displayName} was turned on"
            : "${device.displayName} was turned off"
    }
    sendEvent(name: "switch", value: value, descriptionText: desc)
}

private Map<String, String> parseHeaders(String raw) {
    raw = raw ?: ""
    raw = raw.trim()
    if (!raw) return [:]

    // Option A: JSON map
    if (raw.startsWith("{") && raw.endsWith("}")) {
        def parsed = new JsonSlurper().parseText(raw)
        if (parsed instanceof Map) {
            Map<String, String> headers = [:]
            parsed.each { k, v ->
                if (k != null) headers[k.toString()] = (v == null ? "" : v.toString())
            }
            return headers
        }
        return [:]
    }

    // Option B: one header per line: Name: Value
    Map<String, String> headers = [:]
    raw.split(/\r?\n/).each { line ->
        String trimmed = (line ?: "").trim()
        if (!trimmed) return
        if (trimmed.startsWith("#")) return

        int idx = trimmed.indexOf(":")
        if (idx <= 0) return

        String name = trimmed.substring(0, idx).trim()
        String value = trimmed.substring(idx + 1).trim()
        if (name) headers[name] = value
    }

    return headers
}

private Integer safeTimeoutSeconds() {
    Integer t
    try {
        t = (settings.timeoutSeconds as Integer)
    } catch (Exception ignored) {
        t = 10
    }
    if (t == null || t < 1) t = 1
    if (t > 60) t = 60
    return t
}

// Logging

private void logDebug(String msg) {
    if (settings.debugLogging) {
        log.debug msg
    }
}

private void logDesc(String msg) {
    if (settings.descriptionText) {
        log.info msg
    }
}
