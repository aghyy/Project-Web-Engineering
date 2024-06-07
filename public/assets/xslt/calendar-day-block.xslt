<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    
    <xsl:output method="html" indent="yes"/>
    
    <xsl:template match="/">
        <table class="calendar-popup-table">
            <thead>
                <tr>
                    <th>Zeit</th>
                    <th>Vorlesung</th>
                    <th>Person</th>
                    <th>Raum</th>
                </tr>
            </thead>
            <tbody>
                <xsl:apply-templates select="//lesson"/>
            </tbody>
        </table>
    </xsl:template>
    
    <xsl:template match="lesson">
        <tr>
            <xsl:attribute name="style">
                <xsl:choose>
                    <xsl:when test="exam='true'">
                        <xsl:text> background-color: var(--red);</xsl:text>
                    </xsl:when>
                    <xsl:when test="holiday='true'">
                        <xsl:text> background-color: var(--green);</xsl:text>
                    </xsl:when>
                    <xsl:when test="lecture='true'">
                        <xsl:text> background-color: var(--lecture-event);</xsl:text>
                    </xsl:when>
                    <xsl:when test="other_event='true'">
                        <xsl:text> background-color: var(--other-event);</xsl:text>
                    </xsl:when>
                    <xsl:when test="voluntary='true'">
                        <xsl:text> background-color: var(--volunt-event);</xsl:text>
                    </xsl:when>
                </xsl:choose>
            </xsl:attribute>
            <td>
                <xsl:value-of select="substring(begin, 1, 2)"/>:<xsl:value-of select="substring(begin, 4)"/> - 
                <xsl:value-of select="substring(end, 1, 2)"/>:<xsl:value-of select="substring(end, 4)"/>
            </td>
            <td><xsl:value-of select="name"/></td>
            <td><xsl:value-of select="person"/></td>
            <td><xsl:value-of select="room"/></td>
        </tr>
    </xsl:template>
    
</xsl:stylesheet>