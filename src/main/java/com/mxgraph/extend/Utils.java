package com.mxgraph.extend;

import javax.servlet.ServletContext;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

public class Utils {

    public static Properties getProperties(String key, ServletContext servletContext) throws IOException {
        InputStream inputStream = servletContext.getResourceAsStream("/WEB-INF/" + key);

        Properties props = new Properties();
        try {
            props.load(inputStream);
        } finally {
            // 关闭输入流
            inputStream.close();
        }
        return props;
    }

    public static Map<String, String> parseQueryString(String queryString) throws UnsupportedEncodingException {
        Map<String, String> params = new HashMap<>();
        String[] pairs = queryString.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf("=");
            if (idx > 0) {
                String key = URLDecoder.decode(pair.substring(0, idx), "UTF-8");
                String value = URLDecoder.decode(pair.substring(idx + 1), "UTF-8");
                params.put(key, value);
            }
        }
        return params;
    }
}
