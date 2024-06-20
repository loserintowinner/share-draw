package com.mxgraph.extend.yun139;

import com.mxgraph.online.ServletComm;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;


public class Yun139AuthServlet extends Yun139Auth implements ServletComm {

    /**
     * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
     */
    public void doGet(HttpServletRequest request,
                      HttpServletResponse response) throws ServletException, IOException {
        super.doGetAbst(request, response);
    }

}
