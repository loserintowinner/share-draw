/**
 * Copyright (c) 2006-2019, JGraph Ltd
 */
package com.mxgraph.online;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class GoogleAuthServlet extends GoogleAuth implements ServletComm
{
	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
	 */
	public void doGet(HttpServletRequest request,
                      HttpServletResponse response) throws ServletException, IOException
	{
		super.doGetAbst(request, response);
	}
}