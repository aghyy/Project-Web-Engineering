<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html" indent="yes" encoding="UTF-8"/>

    <!-- Define a template to match the root element -->
    <xsl:template match="days">
        <!-- Apply templates to each day -->
        <xsl:apply-templates select="day"/>
    </xsl:template>

    <!-- Define a template to match each day element -->
    <xsl:template match="day">
        <!-- Extract day, show, and today values -->
        <xsl:variable name="day" select="day"/>
        <xsl:variable name="show" select="show"/>
        <xsl:variable name="today" select="today"/>
        
        <!-- Calculate the grid-column value -->
        <xsl:variable name="columnNumber">
            <xsl:value-of select="((position() - 1) mod 5) + 1"/>
        </xsl:variable>
        
        <!-- Create a div with class 'month-view-card' regardless of the content -->
        <div class="month-view-card">
            <xsl:attribute name="style">
                <xsl:text>grid-column: </xsl:text>
                <xsl:value-of select="$columnNumber"/>
            </xsl:attribute>
            
            <!-- Check if the show parameter is true -->
            <xsl:if test="$show='true'">
                <!-- Create a div with class 'month-view-day' -->
                <div class="month-view-day">
                    <!-- Set class attribute dynamically based on the today parameter -->
                    <xsl:attribute name="class">
                        <xsl:text>month-view-day </xsl:text>
                        <xsl:if test="$today='true'">today</xsl:if>
                    </xsl:attribute>
                    <!-- Output the day value -->
                    <div>
                        <xsl:value-of select="$day"/>
                    </div>
                </div>
                <!-- Create a div with class 'month-view-day-info' -->
                <div class="month-view-day-info">
                    <!-- Additional day info goes here if needed -->
                </div>
            </xsl:if>
        </div>
    </xsl:template>
</xsl:stylesheet>
